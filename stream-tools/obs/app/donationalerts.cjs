'use strict';
const {randomBytes}=require('node:crypto');
const API='https://www.donationalerts.com/api/v1';
const TOKEN='https://www.donationalerts.com/oauth/token';
const SCOPES='oauth-user-show oauth-donation-subscribe';
// Strip controls and directional overrides from viewer-supplied text.
// eslint-disable-next-line no-control-regex
const clean=value=>String(value??'').replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,'').trim();
function donationData(value){
 const amount=String(value.amount??'');
 if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount)||Number(amount)<=0||!['RUB','USD','EUR','BYN','KZT','UAH','BRL','TRY'].includes(value.currency))throw new Error('Проверь сумму и валюту доната.');
 return {amount:Number(amount).toFixed(2),currency:value.currency,donationText:clean(value.donationText).slice(0,500)};
}
function createDonationAlerts({read,save,origin,now,fetchImpl,WebSocketImpl,schedule,onDonation,onDisconnect}){
 let credentials=read('donationalerts-private.json'),closed=false,epoch=0,socket=null,retry=null,heartbeat=null,watchdog=null,renewal=null,expiry=null;
 let connection='disconnected',error='',delay=3000,lastRequest=0,requestTail=Promise.resolve();
 const states=new Map(),seen=new Set(read('donationalerts-seen.json').ids||[]);
 const callbackUrl=()=>`${origin}${origin?'/obs':''}/api/follow/donationalerts/callback`;
 const status=()=>({configured:Boolean(credentials.clientId&&credentials.clientSecret),clientId:credentials.clientId||'',account:credentials.user?.name||null,connection,error,callbackUrl:callbackUrl()});
 const later=(fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref?.();return timer;};
 function request(url,options={}){
  const run=async()=>{
   if(schedule){const wait=Math.max(0,lastRequest+1100-Date.now());if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastRequest=Date.now();}
   if(closed)throw new Error('Подключение закрыто.');
   const response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!response.ok){const failure=new Error('DonationAlerts временно недоступен.');failure.status=response.status;throw failure;}
   return response.json();
  };
  const result=requestTail.then(run);requestTail=result.catch(()=>{});return result;
 }
 function stop(){epoch++;clearTimeout(retry);clearTimeout(expiry);clearInterval(heartbeat);clearTimeout(watchdog);retry=expiry=heartbeat=watchdog=null;const old=socket;socket=null;try{old?.close();}catch{}connection='disconnected';}
 function refresh(){
  if(renewal)return renewal;
  const version=epoch,saved={...credentials};
  renewal=(async()=>{
   if(!saved.refreshToken)throw new Error('Подключи DonationAlerts заново.');
   const tokens=await request(TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:saved.refreshToken,client_id:saved.clientId,client_secret:saved.clientSecret,scope:SCOPES}).toString()});
   if(version!==epoch||closed)throw new Error('Подключение изменилось.');
   if(typeof tokens.access_token!=='string')throw new Error('Подключи DonationAlerts заново.');
   const next={...credentials,accessToken:tokens.access_token,refreshToken:tokens.refresh_token||saved.refreshToken,expiresAt:now()+Math.max(60,Number(tokens.expires_in)||3600)*1000};save('donationalerts-private.json',next);credentials=next;
  })().finally(()=>{renewal=null;});return renewal;
 }
 async function authorized(route,options={},version=epoch){
  if(credentials.expiresAt<now()+60000)await refresh();
  if(version!==epoch||closed)throw new Error('Подключение изменилось.');
  const send=()=>request(API+route,{...options,headers:{...options.headers,Authorization:'Bearer '+credentials.accessToken}});
  try{return await send();}catch(failure){if(failure.status!==401)throw failure;await refresh();if(version!==epoch)throw new Error('Подключение изменилось.');return send();}
 }
 function reconnect(){
  if(closed||!credentials.accessToken||retry)return;
  connection='reconnecting';
  if(schedule){retry=later(()=>{retry=null;void open();},delay);delay=Math.min(60000,delay*2);}
 }
 function failed(version,failure){
  if(version!==epoch||closed)return;
  error=failure.status===401||failure.status===400||failure.status===403?'Разрешение DonationAlerts истекло. Подключи аккаунт заново.':'Связь с DonationAlerts прервалась. Повторяем подключение автоматически.';
  const terminal=[400,401,403].includes(failure.status);
  stop();if(terminal)connection='reauthorize';else reconnect();
 }
 async function open(profile){
  if(closed||!credentials.accessToken)return;
  const version=epoch;connection='connecting';
  try{
   const user=profile||(await authorized('/user/oauth',{},version)).data;
   if(version!==epoch||closed)return;
   if(!user||String(user.id)!==String(credentials.user?.id)||typeof user.socket_connection_token!=='string')throw new Error('Неверный профиль DonationAlerts.');
   const channel='$alerts:donation_'+user.id,ws=new WebSocketImpl('wss://centrifugo.donationalerts.com/connection/websocket');socket=ws;
   let subscribing=false,subscribed=false,sequence=10;
   const current=()=>!closed&&epoch===version&&socket===ws;
   const send=value=>{if(current())ws.send(JSON.stringify(value));};
   const arm=()=>{clearTimeout(watchdog);if(schedule)watchdog=later(()=>{if(current())ws.close();},90000);};arm();
   ws.addEventListener('open',()=>{if(current())send({params:{token:user.socket_connection_token},id:1});});
   ws.addEventListener('message',message=>{
    if(!current()||typeof message.data!=='string'||message.data.length>65536)return;
    for(const line of message.data.split('\n')){
     let frame;try{frame=JSON.parse(line);}catch{continue;}if(!frame||typeof frame!=='object')continue;arm();
     if(frame.error){failed(version,{status:[101,103].includes(frame.error.code)?401:0});return;}
     if(frame.id===1&&typeof frame.result?.client==='string'&&!subscribing){
      if(!/^[a-zA-Z0-9-]{1,100}$/.test(frame.result.client))continue;subscribing=true;
      void authorized('/centrifuge/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channels:[channel],client:frame.result.client})},version).then(result=>{
       if(!current())return;const entry=result.channels?.find(item=>item.channel===channel);
       if(typeof entry?.token!=='string')throw new Error('Нет разрешения на донаты.');
       send({params:{channel,token:entry.token},method:1,id:2});
      }).catch(failure=>failed(version,failure));
     }else if((frame.id===2&&frame.result&&subscribing)||(frame.result?.type===1&&frame.result?.channel===channel)){
      subscribed=true;connection='connected';error='';delay=3000;
      if(schedule&&!heartbeat){heartbeat=setInterval(()=>{try{send({method:7,id:++sequence});}catch{ws.close();}},25000);heartbeat.unref?.();}
     }else if(subscribed&&frame.result?.channel===channel&&frame.result.type===3){
      // A private subscription may expire while the transport remains open.
      ws.close();return;
     }else if(subscribed&&frame.result?.channel===channel&&(frame.result.type===undefined||frame.result.type===0)){
      // Centrifugo v2 wraps the provider resource in Publication.data.
      const publication=frame.result.data,data=publication?.data??publication;
      if(!data||data.name!=='donation'||!Number.isSafeInteger(data.id)||data.id<1||['update','delete','remove'].includes(data.reason))continue;
      const id=String(user.id)+':'+data.id;if(seen.has(id))continue;
      let metadata;try{metadata=donationData({amount:data.amount,currency:data.currency,donationText:data.message_type==='audio'?'Аудиосообщение':data.message});}catch{continue;}
      try{const ids=[...seen,id].slice(-1000);save('donationalerts-seen.json',{ids});seen.clear();for(const item of ids)seen.add(item);}catch{error='Не удалось сохранить номер доната. Проверь место на сервере.';continue;}
      onDonation({kind:'donation',id:'da:'+id,name:clean(data.username).slice(0,64)||'Анонимный зритель',...metadata});
     }
    }
   });
   ws.addEventListener('error',()=>{if(current())ws.close();});
   ws.addEventListener('close',()=>{if(current()){clearInterval(heartbeat);clearTimeout(watchdog);clearTimeout(expiry);heartbeat=watchdog=expiry=null;socket=null;reconnect();}});
   if(schedule)expiry=later(()=>{if(current()){ws.close();}},Math.max(30000,Math.min(1800000,credentials.expiresAt-now()-60000)));
  }catch(failure){failed(version,failure);}
 }
 async function handle(route,req,res,body,json){
  if(!route.startsWith('donationalerts/'))return false;
  const action=route.slice('donationalerts/'.length);
  if(action==='app'&&req.method==='POST'){
   if(typeof body.clientId!=='string'||!/^\d{1,20}$/.test(body.clientId)||typeof body.clientSecret!=='string'||!/^[a-zA-Z0-9_.-]{8,300}$/.test(body.clientSecret))throw new Error('Проверь Client ID и Client Secret DonationAlerts.');
   const next={clientId:body.clientId,clientSecret:body.clientSecret};save('donationalerts-private.json',next);stop();credentials=next;states.clear();error='';onDisconnect();json(res,200,status());
  }else if(action==='connect'&&req.method==='GET'){
   if(!credentials.clientSecret)throw new Error('Сначала сохрани приложение DonationAlerts.');
   for(const [key,value]of states)if(value.expires<now())states.delete(key);while(states.size>=20)states.delete(states.keys().next().value);
   const state=randomBytes(32).toString('base64url');states.set(state,{expires:now()+600000,epoch});
   const url=new URL('https://www.donationalerts.com/oauth/authorize');url.search=new URLSearchParams({client_id:credentials.clientId,redirect_uri:callbackUrl(),response_type:'code',scope:SCOPES,state}).toString();res.writeHead(302,{Location:url.href,'Cache-Control':'no-store'});res.end();
  }else if(action==='callback'&&req.method==='GET'){
   const params=new URL(req.url,'http://localhost').searchParams,key=params.get('state'),state=states.get(key);states.delete(key);
   if(!state||state.expires<now()||state.epoch!==epoch)throw new Error('Ссылка подключения истекла. Вернись в пульт и подключи DonationAlerts заново.');
   if(params.has('error')||!params.get('code')||params.get('code').length>2000)throw new Error('Подключение отменено. Вернись в пульт.');
   const version=epoch,saved={...credentials};
   const tokens=await request(TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:saved.clientId,client_secret:saved.clientSecret,redirect_uri:callbackUrl(),code:params.get('code')}).toString()});
   if(typeof tokens.access_token!=='string')throw new Error('DonationAlerts не выдал разрешение. Попробуй снова.');
   const user=(await request(API+'/user/oauth',{headers:{Authorization:'Bearer '+tokens.access_token}})).data;
   if(!user||!Number.isSafeInteger(user.id)||user.id<1||typeof user.socket_connection_token!=='string')throw new Error('Не удалось проверить профиль DonationAlerts.');
   if(version!==epoch||closed)throw new Error('Настройки подключения изменились. Попробуй снова.');
   const next={...saved,accessToken:tokens.access_token,refreshToken:tokens.refresh_token||'',expiresAt:now()+Math.max(60,Number(tokens.expires_in)||3600)*1000,user:{id:user.id,name:clean(user.name||user.code).slice(0,64)}};
   save('donationalerts-private.json',next);stop();credentials=next;states.clear();error='';void open(user);
   res.writeHead(303,{Location:`${origin?'/obs':''}/follow-control.html?kind=donation&connected=1`,'Cache-Control':'no-store'});res.end();
  }else if(action==='disconnect'&&req.method==='POST'){
   const next={clientId:credentials.clientId,clientSecret:credentials.clientSecret};save('donationalerts-private.json',next);stop();credentials=next;states.clear();error='';onDisconnect();json(res,200,status());
  }else json(res,404,{error:'Неизвестный запрос DonationAlerts.'});
  return true;
 }
 if(schedule&&credentials.accessToken)retry=later(()=>{retry=null;void open();},0);
 return {handle,status,close(){closed=true;stop();states.clear();}};
}
module.exports={createDonationAlerts,donationData};
