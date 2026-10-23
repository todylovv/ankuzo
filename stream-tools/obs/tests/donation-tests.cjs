const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createFollow}=require('../app/follow.cjs');
class Socket extends EventTarget {
 static instances=[];
 constructor(url){super();this.url=url;this.sent=[];Socket.instances.push(this);}
 send(data){this.sent.push(JSON.parse(data));}
 close(){this.dispatchEvent(new Event('close'));}
 emit(data){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)}));}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({directory:existing,now=Date.now,expiresIn=3600,voiceLoader}={}){
 const directory=existing||fs.mkdtempSync(path.join(os.tmpdir(),'donation-test-')),calls=[];
 const fetchImpl=async(url,options={})=>{calls.push({url,options});return {ok:true,json:async()=>String(url).endsWith('/token')?{access_token:'DA_ACCESS_PRIVATE',...(String(options.body).includes('grant_type=refresh_token')?{}:{refresh_token:'DA_REFRESH_PRIVATE'}),expires_in:expiresIn}:String(url).endsWith('/user/oauth')?{data:{id:42,name:'Ankuzo',code:'ankuzo',socket_connection_token:'DA_SOCKET_PRIVATE',email:'private@example.com'}}:{channels:[{channel:'$alerts:donation_42',token:'DA_CHANNEL_PRIVATE'}]}};};
 const follow=createFollow({directory,origin:'https://ankuzo.online',fetchImpl,WebSocketImpl:Socket,schedule:false,now,voiceLoader});
 const {createServer}=require('../app/server.cjs');
 const server=createServer({persist:false,controlKey:'test-key',followService:follow,chatFeed:{start(){},snapshot(){return{};},close(){}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(route,body,auth=true)=>fetch(base+'/api/follow/'+route,{redirect:'manual',headers:{...(auth?{Authorization:'Bearer test-key'}:{}),...(body?{'Content-Type':'application/json','X-Ankuzo-Control':'1'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
 return {follow,request,calls,directory,async close({keep=false}={}){follow.close();server.closeAllConnections();await new Promise(r=>server.close(r));if(!keep)fs.rmSync(directory,{recursive:true,force:true});}};
}
async function authorize(h){
 assert.equal((await h.request('donationalerts/app',{clientId:'12345',clientSecret:'secret_da_123456'})).status,200);
 const response=await h.request('donationalerts/connect');assert.equal(response.status,302);
 const url=new URL(response.headers.get('location'));
 assert.equal(url.hostname,'www.donationalerts.com');assert.equal(url.searchParams.get('scope'),'oauth-user-show oauth-donation-subscribe');
 const callback='donationalerts/callback?code=CODE&state='+url.searchParams.get('state');
 assert.equal((await h.request(callback)).status,303);return callback;
}
test('donations have independent settings, validated metadata and share the serial alert queue',async()=>{
 const h=await harness();try{
  assert.equal((await h.request('settings',{kind:'donation',duration:12,message:'Спасибо за поддержку',volume:.4})).status,200);
  const a=h.follow.enqueue({kind:'follow',id:'follow',name:'Alice'});
  const b=h.follow.enqueue({kind:'donation',id:'donation',name:'Bob',amount:'1500.50',currency:'RUB',donationText:'<b>Удачного стрима!</b>'});
  assert.ok(b.startsAt>a.endsAt);assert.equal(b.amount,'1500.50');assert.equal(b.donationText,'<b>Удачного стрима!</b>');
  assert.equal(h.follow.enqueue({kind:'donation',id:'bad',name:'Bob',amount:-1,currency:'RUB'}),null);
  assert.equal((await h.request('test',{kind:'donation',amount:'500',currency:'RUB',donationText:'Хорошего стрима!'})).status,200);
  await h.request('settings',{kind:'donation',enabled:false});assert.ok(h.follow.snapshot().events.every(e=>e.kind==='follow'));
  assert.equal(h.follow.snapshot().settings.duration,8);
 }finally{await h.close();}
});
function voiceWav(seconds=2){const rate=8000,size=seconds*rate*2,bytes=Buffer.alloc(44+size);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVE',8);bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(size,40);return bytes;}
test('attached donor audio extends its slot, is served privately with ranges and never exposes its URL',async()=>{
 const h=await harness();try{
  const response=await h.request('test',{kind:'donation',name:'Voice viewer',amount:'500',currency:'RUB',voiceData:voiceWav(14).toString('base64')});
  assert.equal(response.status,200);const first=h.follow.snapshot().events[0];assert.ok(first.voice?.id);assert.equal(first.voice.durationMs,14000);assert.ok(first.endsAt-first.startsAt>=16500);
  const next=h.follow.enqueue({kind:'follow',id:'after-voice',name:'Alice'});assert.ok(next.startsAt>first.endsAt);
  const audio=await h.request('voice?id='+first.voice.id);assert.equal(audio.status,200);assert.equal(audio.headers.get('content-type'),'audio/wav');
  assert.equal((await h.request('voice?id='+first.voice.id,undefined,false)).status,401);
  assert.equal((await h.request('voice?id=../../etc/passwd')).status,404);
  assert.equal((await h.request('test',{kind:'donation',amount:'500',currency:'RUB',voiceData:'aGVsbG8='})).status,400);
 }finally{await h.close();}
});
test('DonationAlerts voice download is serialized with text donations and has a visible fallback',async()=>{
 const urls=[],h=await harness({voiceLoader:async url=>{urls.push(url);if(url.includes('bad'))throw Error('download failed');return {bytes:voiceWav(14),mime:'audio/wav',durationMs:14000};}});try{
  await authorize(h);const ws=Socket.instances.at(-1);ws.dispatchEvent(new Event('open'));ws.emit({id:1,result:{client:'uuid-42'}});await tick();await tick();ws.emit({id:2,result:{}});
  const send=(id,message_type,message)=>ws.emit({result:{channel:'$alerts:donation_42',data:{data:{id,name:'donation',username:'Alice',amount:200,currency:'RUB',message_type,message}}}});
  send(601,'audio','https://static.donationalerts.ru/uploads/audio/voice.ogg');send(602,'text','Текст после голоса');send(603,'audio','https://static.donationalerts.ru/uploads/audio/bad.ogg');await tick();await tick();await tick();
  const events=h.follow.snapshot().events;assert.equal(events.length,3);assert.ok(events[0].voice?.id);assert.equal(events[1].donationText,'Текст после голоса');assert.ok(events[2].voiceUnavailable);assert.ok(!JSON.stringify(events).includes('https://'));
  assert.equal(urls.length,2);
 }finally{await h.close();}
});
test('voice loader only fetches HTTPS DonationAlerts hosts, bounds data and measures duration',async()=>{
 const {createVoiceStore}=require('../app/donation-voice.cjs'),calls=[];
 const store=createVoiceStore({fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(voiceWav(2),{headers:{'Content-Type':'audio/wav'}});}});
 for(const url of ['http://static.donationalerts.ru/a','https://127.0.0.1/a','https://static.donationalerts.ru.evil.test/a','https://user:pass@static.donationalerts.ru/a','file:///tmp/a','https://static.donationalerts.ru:8443/a'])await assert.rejects(()=>store.load(url));
 assert.equal(calls.length,0);const audio=await store.load('https://static.donationalerts.ru/uploads/audio/test.wav');assert.equal(audio.durationMs,2000);assert.equal(calls[0].options.redirect,'error');
 await assert.rejects(()=>store.fromBuffer(Buffer.alloc(5*1024*1024+1)));await assert.rejects(()=>store.fromBuffer(Buffer.from('<html>not audio</html>')));store.close();
});
test('Centrifugo acknowledgement without channel is accepted and Twitch disconnect keeps donations',async()=>{
 const h=await harness();try{
  await authorize(h);const ws=Socket.instances.at(-1);ws.dispatchEvent(new Event('open'));ws.emit({id:1,result:{client:'uuid-42'}});await tick();await tick();
  ws.emit({id:2,result:{recoverable:false}});
  assert.equal((await(await h.request('status')).json()).donationalerts.connection,'connected');
  ws.emit({result:{type:0,channel:'$alerts:donation_42',data:{id:102,name:'donation',username:'Alice',amount:20,currency:'USD',message_type:'audio',message:'https://example.com/private-audio'}}});
  await h.request('twitch/disconnect',{});assert.equal(h.follow.snapshot().events.length,1);assert.equal(h.follow.snapshot().events[0].donationText,'Аудиосообщение');
 }finally{await h.close();}
});
test('donation duplicate IDs survive restarts and OAuth refresh preserves an omitted refresh token',async()=>{
 let h=await harness({expiresIn:60});
 try{
  await authorize(h);let ws=Socket.instances.at(-1);ws.dispatchEvent(new Event('open'));ws.emit({id:1,result:{client:'uuid-42'}});await tick();await tick();await tick();
  assert.ok(h.calls.some(c=>String(c.options.body).includes('grant_type=refresh_token')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(h.directory,'donationalerts-private.json'))).refreshToken,'DA_REFRESH_PRIVATE');
  ws.emit({id:2,result:{channel:'$alerts:donation_42'}});const data={id:300,name:'donation',amount:500,currency:'RUB',username:'Alice',message:'Hi'};
  ws.emit({result:{channel:'$alerts:donation_42',data}});await tick();assert.equal(h.follow.snapshot().events.length,1);
  const directory=h.directory;await h.close({keep:true});h=await harness({directory});
  await authorize(h);ws=Socket.instances.at(-1);ws.dispatchEvent(new Event('open'));ws.emit({id:1,result:{client:'uuid-42'}});await tick();await tick();ws.emit({id:2,result:{channel:'$alerts:donation_42'}});
  ws.emit({result:{channel:'$alerts:donation_42',data}});assert.equal(h.follow.snapshot().events.length,0);
 }finally{await h.close();}
});
test('DonationAlerts state expires without provider calls; donation audio is isolated',async()=>{
 let time=1000;const h=await harness({now:()=>time});try{
  await h.request('donationalerts/app',{clientId:'12345',clientSecret:'secret_da_123456'});
  const connect=await h.request('donationalerts/connect'),url=new URL(connect.headers.get('location'));time+=600001;
  assert.equal((await h.request('donationalerts/callback?code=X&state='+url.searchParams.get('state'))).status,400);assert.equal(h.calls.length,0);
  const wav=Buffer.alloc(64);wav.write('RIFF');wav.write('WAVE',8);
  for(const kind of ['follow','subscription','donation'])assert.equal((await h.request('audio',{kind,name:kind+'.wav',data:wav.toString('base64')})).status,200);
  await h.request('audio',{kind:'donation',remove:true});const status=await(await h.request('status')).json();assert.ok(status.audio.available&&status.subscription.audio.available&&!status.donation.audio.available);
  for(const body of [{amount:0,currency:'RUB'},{amount:'1.001',currency:'RUB'},{amount:'3',currency:'XXX'}])assert.equal((await h.request('test',{kind:'donation',...body})).status,400);
 }finally{await h.close();}
});
test('DonationAlerts OAuth is private, one-use and Centrifugo only accepts own donation channel',async()=>{
 const h=await harness();try{
  assert.equal((await h.request('donationalerts/connect',undefined,false)).status,401);
  assert.equal((await h.request('donationalerts/callback?code=bad&state=bad')).status,400);
  const callback=await authorize(h);assert.equal((await h.request(callback)).status,400);
  const ws=Socket.instances.at(-1);assert.equal(ws.url,'wss://centrifugo.donationalerts.com/connection/websocket');ws.dispatchEvent(new Event('open'));
  assert.equal(ws.sent[0].params.token,'DA_SOCKET_PRIVATE');
  ws.emit({id:1,result:{client:'d558c046-c679-43e3-a62d-65989ab55f7c'}});await tick();await tick();
  assert.equal(ws.sent.at(-1).params.channel,'$alerts:donation_42');
  ws.emit({id:2,result:{channel:'$alerts:donation_42'}});
  const data={id:101,name:'donation',username:'Зритель',amount:500,currency:'RUB',message_type:'text',message:'Привет!',reason:'new'};
  ws.emit({result:{channel:'$alerts:donation_99',data}});assert.equal(h.follow.snapshot().events.length,0);
  ws.emit({result:{channel:'$alerts:donation_42',data:{offset:4,data}}});ws.emit({result:{channel:'$alerts:donation_42',data:{offset:4,data}}});await tick();
  assert.equal(h.follow.snapshot().events.length,1);assert.equal(h.follow.snapshot().events[0].donationText,'Привет!');
  const publicData=JSON.stringify(h.follow.snapshot()),status=await(await h.request('status')).json();
  for(const secret of ['DA_ACCESS_PRIVATE','DA_REFRESH_PRIVATE','DA_SOCKET_PRIVATE','DA_CHANNEL_PRIVATE','private@example.com']){assert.ok(!publicData.includes(secret));assert.ok(!JSON.stringify(status).includes(secret));}
  assert.equal(status.donationalerts.connection,'connected');assert.equal(fs.statSync(path.join(h.directory,'donationalerts-private.json')).mode&0o777,0o600);
  await h.request('donationalerts/disconnect',{});assert.equal((await(await h.request('status')).json()).donationalerts.account,null);
 }finally{await h.close();}
});
