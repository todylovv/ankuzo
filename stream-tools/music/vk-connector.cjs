// Private browser connector: the owner signs in through VK's own QR flow.
const http=require('node:http'),fs=require('node:fs'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const config=JSON.parse(fs.readFileSync('/run/music-config.json','utf8'));
let contextPromise,authPage=null,busy=false;
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y);};
const context=()=>contextPromise||(contextPromise=chromium.launchPersistentContext('/profile',{headless:true,locale:'ru-RU',viewport:{width:1280,height:720},args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']}));
async function status(){const ctx=await context();const cookies=await ctx.cookies('https://vk.ru');const connected=cookies.some(x=>['remixsid','remixsid6'].includes(x.name)&&x.value.length>20);return {connected,pending:!connected&&Boolean(authPage&&!authPage.isClosed())};}
async function connect(){
 if((await status()).connected)return status();
 const ctx=await context();if(authPage&&!authPage.isClosed())await authPage.close();authPage=await ctx.newPage();
 await authPage.goto('https://vk.ru/',{waitUntil:'domcontentloaded',timeout:30000});
 const heading=authPage.getByRole('heading',{name:'Вход ВКонтакте',exact:true});
 try{await heading.waitFor({timeout:7000});}catch{const login=authPage.getByRole('button',{name:/^(Войти|Sisene|Log in)$/i}).first();await login.waitFor({timeout:15000});await login.click();await heading.waitFor({timeout:20000});}
 return status();
}
async function qr(){
 if(!authPage||authPage.isClosed())throw Error('Сначала нажмите «Подключить VK»');
 const heading=authPage.getByRole('heading',{name:'Вход ВКонтакте',exact:true});const box=await heading.boundingBox();if(!box)throw Error('Код обновляется. Подождите немного');
 const center=box.x+box.width/2;
 return authPage.screenshot({clip:{x:Math.max(0,center-125),y:Math.max(0,box.y-220),width:250,height:220}});
}
async function resolveTrack(url,maxDuration){
 if(!/^https:\/\/vk\.ru\/audio-?\d+_\d+(?:_[a-f0-9]{8,64})?$/.test(url))throw Error('Нужна ссылка на один трек VK');
 if(busy)throw Error('VK занят подготовкой предыдущего трека. Повторите позже');busy=true;
 const ctx=await context();const page=await ctx.newPage();
 try{
  let track=null,stream=null;
  page.on('response',async response=>{
   try{const parsed=new URL(response.url());if(parsed.hostname==='web.api.vk.ru'&&parsed.pathname==='/method/audio.getById'){const data=await response.json();const result=data.response;const expected=url.match(/audio(-?\d+)_(\d+)/);if(Array.isArray(result))track=result.find(x=>String(x.owner_id)===expected[1]&&String(x.id)===expected[2])||null;}
    if(/(?:^|\.)vkuseraudio\.(ru|net)$/.test(parsed.hostname)&&(response.headers()['content-type']||'').includes('mpegurl'))stream=response.url();
   }catch{}
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});const play=page.getByRole('button',{name:/^(Слушать|Kuula|Listen|Play)$/i}).first();await play.waitFor({timeout:25000});await play.click();
  const deadline=Date.now()+20000;while((!track||!stream)&&Date.now()<deadline)await page.waitForTimeout(250);
  if(!track)throw Error('VK не отдал сведения о треке');
  if(!Number.isFinite(track.duration)||track.duration>maxDuration)throw Error('Трек длиннее установленного лимита');
  if(track.stream_duration&&track.stream_duration<track.duration-3)throw Error('VK отдал только фрагмент. Подключите аккаунт VK в настройках');
  const mediaUrl=track.url||stream;if(!mediaUrl)throw Error('VK не отдал аудиопоток');
  const thumb=track.album?.thumb||track.thumb||{};
  return {title:track.artist+' — '+track.title,duration:track.duration,url:mediaUrl,coverUrl:thumb.photo_600||thumb.photo_300||thumb.photo_270||null};
 }finally{await page.close();busy=false;}
}
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 if(!equal(String(req.headers.authorization||'').replace(/^Bearer /,''),config.adminKey))return send(res,401,{error:'Not authorized'});
 try{
  if(req.url==='/status'&&req.method==='GET')return send(res,200,await status());
  if(req.url==='/connect'&&req.method==='POST')return send(res,200,await connect());
  if(req.url==='/qr'&&req.method==='GET'){const image=await qr();res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});return res.end(image);}
  if(req.url==='/resolve'&&req.method==='POST'){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Запрос слишком большой');}const data=JSON.parse(text);if(!Number.isInteger(data.maxDuration)||data.maxDuration<15||data.maxDuration>1800)throw Error('Некорректный лимит');return send(res,200,await resolveTrack(data.url,data.maxDuration));}
  send(res,404,{error:'Not found'});
 }catch(error){const allowed=/VK|Нужна|Трек|Код|Сначала|Запрос|лимит/.test(error.message);send(res,400,{error:allowed?error.message:'VK временно не ответил. Повторите попытку'});}
});
server.listen(17225,'0.0.0.0',()=>console.log('Private VK music connector ready'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{if(contextPromise)await (await contextPromise).close();server.close(()=>process.exit(0));});
