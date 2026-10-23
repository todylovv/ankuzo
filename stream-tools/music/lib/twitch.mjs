import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export class Twitch {
 constructor({config={},file=null,fetcher=fetch,onOrder=async()=>{}}={}){
  this.config=config;this.file=file;this.fetcher=fetcher;this.onOrder=onOrder;this.tokens=null;this.rewardId=config.rewardId||null;this.pending=null;this.timer=null;this.polling=false;this.error=null;this.refreshing=null;
  if(file){try{const stored=JSON.parse(readFileSync(file,'utf8'));this.tokens=stored.tokens;this.rewardId=stored.rewardId||null;}catch(e){if(e.code!=='ENOENT')throw e;}}
 }
 save(){if(this.file){mkdirSync(dirname(this.file),{recursive:true});writeFileSync(this.file+'.tmp',JSON.stringify({tokens:this.tokens,rewardId:this.rewardId}),{mode:0o600});renameSync(this.file+'.tmp',this.file);}}
 status(){return {configured:Boolean(this.config.clientId),connected:Boolean(this.tokens),login:this.tokens?.login||null,rewardId:this.rewardId,error:this.error,pending:this.pending?{userCode:this.pending.user_code,verificationUri:this.pending.verification_uri,expiresAt:this.pending.expiresAt}:null};}
 async request(url,options={}){
  const r=await this.fetcher(url,{...options,signal:AbortSignal.timeout(15000)});let data;try{data=await r.json();}catch{throw Error('Twitch временно недоступен');}
  return {ok:r.ok,status:r.status,data};
 }
 async form(path,values){return this.request('https://id.twitch.tv/oauth2/'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values)});}
 scopes(){return [...new Set([...(this.config.existingScopes||[]),'channel:manage:redemptions'])].join(' ');}
 async startDevice(){
  if(!this.config.clientId)throw Error('Приложение Twitch ещё не настроено');
  if(this.pending&&this.pending.expiresAt>Date.now())return this.status().pending;
  const result=await this.form('device',{client_id:this.config.clientId,scopes:this.scopes()});
  if(!result.ok)throw Error('Twitch не выдал код подключения. Повторите позже');
  const d=result.data;const uri=new URL(d.verification_uri);if(uri.origin!=='https://www.twitch.tv')throw Error('Неожиданный адрес авторизации Twitch');
  this.pending={...d,expiresAt:Date.now()+d.expires_in*1000,nextPoll:0};this.error=null;return this.status().pending;
 }
 async acceptToken(value){
  const validation=await this.request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:'OAuth '+value.access_token}});
  const id=validation.data;
  if(!validation.ok||id.client_id!==this.config.clientId||id.login!==this.config.expectedLogin||!id.scopes?.includes('channel:manage:redemptions'))throw Error('Нужно подключить канал '+this.config.expectedLogin+' с доступом к наградам');
  this.tokens={...value,userId:id.user_id,login:id.login,expiresAt:Date.now()+value.expires_in*1000,validatedAt:Date.now()};this.pending=null;this.error=null;this.save();
 }
 async refresh(){
  if(this.refreshing)return this.refreshing;
  this.refreshing=(async()=>{
   const result=await this.form('token',{client_id:this.config.clientId,...(this.config.clientSecret?{client_secret:this.config.clientSecret}:{}),grant_type:'refresh_token',refresh_token:this.tokens.refresh_token});
   if(!result.ok)throw Error('Подключите Twitch повторно');await this.acceptToken(result.data);
  })().finally(()=>{this.refreshing=null;});return this.refreshing;
 }
 async access(){
  if(!this.tokens)throw Error('Сначала подключите Twitch');
  if(this.tokens.expiresAt<Date.now()+120000)await this.refresh();
  if(this.tokens.validatedAt<Date.now()-3600000){const identity=await this.request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:'OAuth '+this.tokens.access_token}});if(!identity.ok||identity.data.user_id!==this.tokens.userId)throw Error('Подключите Twitch повторно');this.tokens.validatedAt=Date.now();this.save();}
  return this.tokens;
 }
 async api(path,{method='GET',body}={}){
  await this.access();const send=()=>this.request('https://api.twitch.tv/helix/'+path,{method,headers:{Authorization:'Bearer '+this.tokens.access_token,'Client-Id':this.config.clientId,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  let r=await send();if(r.status===401){await this.refresh();r=await send();}return r;
 }
 async rewards(){const r=await this.api('channel_points/custom_rewards?broadcaster_id='+this.tokens.userId+'&only_manageable_rewards=true');if(!r.ok)throw Error('Не удалось получить награды Twitch');return r.data.data.map(x=>({id:x.id,title:x.title,cost:x.cost}));}
 async createReward(settings){
  const r=await this.api('channel_points/custom_rewards?broadcaster_id='+this.tokens.userId,{method:'POST',body:{title:settings.rewardTitle,cost:settings.rewardCost,is_user_input_required:true,prompt:'Вставьте ссылку на один трек или клип',should_redemptions_skip_request_queue:false,is_enabled:true,is_max_per_user_per_stream_enabled:false,is_global_cooldown_enabled:true,global_cooldown_seconds:15}});
  if(!r.ok)throw Error('Twitch не создал награду. Проверьте уникальность названия и доступность баллов канала');this.rewardId=r.data.data[0].id;this.save();return r.data.data[0];
 }
 async selectReward(id){const rewards=await this.rewards();if(!rewards.some(x=>x.id===id))throw Error('Выберите награду, которой может управлять это приложение');this.rewardId=id;this.save();}
 async settle(item,status){
  await this.access();const path='channel_points/custom_rewards/redemptions?'+new URLSearchParams({broadcaster_id:this.tokens.userId,reward_id:item.rewardId,id:item.redemptionId});
  try{const r=await this.api(path,{method:'PATCH',body:{status}});if(r.ok)return;}catch{ /* Reconcile a lost response using Twitch's recorded status. */ }
  // PATCH may have succeeded before a response was lost. Reconcile before reporting failure.
  const check=await this.api(path);if(check.ok&&check.data.data?.[0]?.status===status)return;
  throw Error(status==='CANCELED'?'Twitch не подтвердил возврат. Заявка могла быть уже завершена':'Twitch не подтвердил выполнение');
 }
 async tick(){
  if(this.polling)return;this.polling=true;
  try{
   if(this.pending){
    if(this.pending.expiresAt<Date.now()){this.pending=null;this.error='Код истёк. Нажмите «Подключить» ещё раз';}
    else if(Date.now()>=this.pending.nextPoll){this.pending.nextPoll=Date.now()+Math.max(5,this.pending.interval||5)*1000;const r=await this.form('token',{client_id:this.config.clientId,...(this.config.clientSecret?{client_secret:this.config.clientSecret}:{}),scopes:this.scopes(),device_code:this.pending.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'});if(r.ok){try{await this.acceptToken(r.data);}catch(e){this.pending=null;throw e;}}else if(r.data.message==='slow_down')this.pending.interval=(this.pending.interval||5)+5;else if(r.data.message!=='authorization_pending'){this.pending=null;throw Error('Twitch не подтвердил подключение. Попробуйте снова');}}
   }
   if(!this.tokens||!this.rewardId)return;
   let cursor='';const orders=[];
   for(let page=0;page<10;page++){
    const params=new URLSearchParams({broadcaster_id:this.tokens.userId,reward_id:this.rewardId,status:'UNFULFILLED',first:'50',sort:'OLDEST'});if(cursor)params.set('after',cursor);
    const r=await this.api('channel_points/custom_rewards/redemptions?'+params);if(!r.ok)throw Error('Не удалось проверить новые заказы Twitch');orders.push(...r.data.data);cursor=r.data.pagination?.cursor;if(!cursor)break;
   }
   for(const order of orders)await this.onOrder({url:order.user_input,user:order.user_name,redemptionId:order.id,rewardId:order.reward.id});this.error=null;
  }catch{this.error='Нет связи с Twitch. Проверьте подключение; заказы будут проверены повторно';}finally{this.polling=false;}
 }
 start(){this.timer=setInterval(()=>this.tick(),5000);this.timer.unref();this.tick();}
 close(){clearInterval(this.timer);}
}
