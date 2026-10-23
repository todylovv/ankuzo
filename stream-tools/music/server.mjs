import http from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync,statSync,createReadStream,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname,extname,resolve} from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {Queue} from './lib/queue.mjs';
import {Media} from './lib/media.mjs';
import {Twitch} from './lib/twitch.mjs';
import {Yandex} from './lib/yandex.mjs';
import {VK} from './lib/vk.mjs';
import {Background} from './lib/background.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
const equal=(a,b)=>{const x=Buffer.from(String(a||''));const y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);};
const mime={'.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.mp4':'video/mp4','.m4a':'audio/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.opus':'audio/ogg'};
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>8192)throw Error('Слишком большой запрос');}try{return JSON.parse(data);}catch{throw Error('Некорректный запрос');}}
export function createApp({directory=join(ROOT,'data'),adminKey='',origin='https://ankuzo.online',adminBase='/obs/music',overlayBase='/obs/view/music',dev=false,startWorkers=true,config={},media:providedMedia,backgroundFeedback=true}={}){
 mkdirSync(directory,{recursive:true});const mediaDirectory=join(directory,'media');mkdirSync(mediaDirectory,{recursive:true});
 const tokenFile=join(directory,'viewer.json');let viewerToken;
 try{viewerToken=JSON.parse(readFileSync(tokenFile,'utf8')).token;if(!/^[A-Za-z0-9_-]{43}$/.test(viewerToken))throw Error('Invalid viewer token');}catch(e){if(e.code!=='ENOENT')throw e;viewerToken=randomBytes(32).toString('base64url');writeFileSync(tokenFile,JSON.stringify({token:viewerToken}),{mode:0o600});}
 const queue=new Queue({file:join(directory,'state.json')});const yandex=new Yandex({directory});const vk=new VK({key:adminKey,directory:mediaDirectory});const media=providedMedia||new Media({directory:mediaDirectory,executable:config.ytdlp||'yt-dlp',yandex,vk});
 const twitch=new Twitch({config:config.twitch||{},file:join(directory,'twitch.json'),onOrder:async(input)=>{
  let item;try{item=queue.add(input);}catch(error){item=queue.invalid(input,error.message);}
  if(item.status==='error'&&queue.state.settings.autoRefund&&!item.settled)await queue.refund(item.id,x=>twitch.settle(x,'CANCELED')).catch(()=>{});
  media.work(queue,x=>queue.refund(x.id,y=>twitch.settle(y,'CANCELED')));
 }});
 const onMediaFailure=x=>queue.refund(x.id,y=>twitch.settle(y,'CANCELED'));const work=()=>media.work(queue,onMediaFailure);
 const background=new Background({queue,yandex,media,onFailure:onMediaFailure,feedbackEnabled:backgroundFeedback});
 const viewerState=()=>{const s=queue.snapshot();const c=s.current;return {serverNow:s.serverNow,revision:s.revision,epoch:s.epoch,playing:s.playing,position:s.position,playerConnected:s.playerConnected,settings:{showVideo:s.settings.showVideo,volume:s.settings.volume},current:c?{id:c.id,title:c.title,user:c.user,duration:c.duration,provider:c.provider,lane:c.lane||'order',substituted:c.substituted,hasCover:Boolean(c.coverFilename)}:null};};
 const adminState=()=>({...queue.snapshot(),twitch:twitch.status(),yandex:yandex.status(),vk:vk.status(),overlayUrl:dev?'/view/'+viewerToken+'/':origin+overlayBase+'/'+viewerToken+'/'});
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 function serve(req,res,file){
  const stat=statSync(file);const type=mime[extname(file)]||'application/octet-stream';const headers={'Content-Type':type,'Content-Length':stat.size,'Cache-Control':'no-store','Accept-Ranges':'bytes'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const m=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end();}
   if(!m[1]){start=Math.max(0,stat.size-Number(m[2]));}else{start=Number(m[1]);if(m[2])end=Math.min(Number(m[2]),end);}
   if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end();}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'");
  try{
   let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{return json(res,400,{error:'Некорректный адрес'});}
   // Caddy forwards the music path intact, preserving the shared /obs/ Basic realm.
   if(pathname.startsWith('/obs/view/music/'))pathname='/view/'+pathname.slice('/obs/view/music/'.length);
   else if(pathname==='/obs/music'||pathname.startsWith('/obs/music/'))pathname=pathname.slice('/obs/music'.length)||'/';
   const viewer=pathname.startsWith('/view/');
   if(viewer){const match=pathname.match(/^\/view\/([\w-]{43})(\/.*)?$/);if(!match||!equal(match[1],viewerToken))return json(res,401,{error:'Ссылка на виджет недействительна'});pathname=match[2]||'/';}
   else if(!equal(String(req.headers.authorization||'').replace(/^Bearer /,''),adminKey)||!adminKey){if(!(dev&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)))return json(res,401,{error:'Войдите в панель OBS'});}
   const mutation=!['GET','HEAD'].includes(req.method);
   if(mutation){if(req.method!=='POST')return json(res,405,{error:'Метод не поддерживается'});if(req.headers['x-ankuzo-music']!=='1'||(req.headers.origin&&req.headers.origin!==(dev?'http://'+req.headers.host:origin)))return json(res,403,{error:'Обновите страницу и повторите действие'});}
   if(viewer&&!(['/','/overlay.html','/overlay.js','/motion.js','/overlay.css','/shared.css','/api/state','/api/player'].includes(pathname)||/^\/assets\/[a-z0-9.-]+\.woff2$/.test(pathname)||/^\/(?:media|cover)\/[a-f0-9-]{36}$/.test(pathname)))return json(res,403,{error:'Ссылка предназначена только для воспроизведения'});
   if(pathname==='/api/state'&&!mutation)return json(res,200,viewer?viewerState():adminState());
   if(pathname==='/api/preview-player'&&mutation){if(viewer)return json(res,403,{error:'Войдите в музыкальный пульт'});const data=await body(req);if(data.type==='release'){queue.release(data.player);return json(res,200,{owner:false});}const lease=queue.heartbeat(data.player,'preview');if(lease.owner&&data.event)queue.playerEvent(data.player,data.event);return json(res,200,{...lease,...adminState()});}
   if(pathname==='/api/player'&&mutation){if(!viewer)return json(res,403,{error:'Откройте ссылку для OBS'});const data=await body(req);if(data.type==='release'){queue.release(data.player);return json(res,200,{owner:false});}const lease=queue.heartbeat(data.player);if(lease.owner&&data.event)queue.playerEvent(data.player,data.event);return json(res,200,{...lease,...viewerState()});}
   if(pathname==='/api/control'&&mutation){const data=await body(req);
    if(data.action==='add'){const item=queue.add({url:data.url,user:'Ankuzo'});work();return json(res,202,{id:item.id});}
    if(data.action==='play')queue.play();else if(data.action==='pause')queue.pause();else if(data.action==='skip')queue.skip();else if(data.action==='seek')queue.seek(data.position);else if(data.action==='move')queue.move(data.id,data.beforeId);else if(data.action==='settings')queue.settings(data.settings);else if(data.action==='remove')queue.reject(data.id);else if(data.action==='refund')await queue.refund(data.id,x=>twitch.settle(x,'CANCELED'));else if(data.action==='complete')await queue.complete(data.id,x=>twitch.settle(x,'FULFILLED'));else return json(res,400,{error:'Неизвестное действие'});
    return json(res,200,adminState());
   }
   if(pathname==='/api/background'&&mutation){const data=await body(req);if(data.action==='source')await background.configure({kind:data.kind,key:data.key});else background.control(data.action);background.tick();return json(res,200,adminState());}
   if(pathname==='/api/yandex/library'&&!mutation)return json(res,200,await yandex.library());
   if(pathname==='/api/yandex/search'&&!mutation){const query=new URL(req.url,'http://localhost').searchParams.get('q')||'';if(!query.trim()||query.length>120)return json(res,400,{error:'Введите запрос длиной до 120 символов'});return json(res,200,await yandex.search(query));}
   if(pathname==='/api/twitch/connect'&&mutation)return json(res,200,await twitch.startDevice());
   if(pathname==='/api/yandex/connect'&&mutation)return json(res,200,await yandex.connect());
   if(pathname==='/api/vk/connect'&&mutation)return json(res,200,await vk.connect());
   if(pathname==='/api/vk/qr'&&!mutation){const image=await vk.qr();res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});return res.end(image);}
   if(pathname==='/api/twitch/rewards'&&!mutation)return json(res,200,{rewards:await twitch.rewards()});
   if(pathname==='/api/twitch/reward'&&mutation){const data=await body(req);if(data.id)await twitch.selectReward(data.id);else await twitch.createReward(queue.state.settings);return json(res,200,twitch.status());}
   const coverMatch=pathname.match(/^\/cover\/([a-f0-9-]{36})$/);
   if(coverMatch&&!mutation){const item=queue.item(coverMatch[1]);if(!item.coverFilename||!['playing','ready','played'].includes(item.status))return json(res,404,{error:'Обложка недоступна'});const file=join(mediaDirectory,item.coverFilename);if(dirname(file)!==mediaDirectory||!existsSync(file))return json(res,404,{error:'Обложка недоступна'});return serve(req,res,file);}
   const mediaMatch=pathname.match(/^\/media\/([a-f0-9-]{36})$/);
   if(mediaMatch&&!mutation){const item=queue.item(mediaMatch[1]);if(!item.filename||!['playing','ready','played'].includes(item.status))return json(res,404,{error:'Файл не готов'});const file=join(mediaDirectory,item.filename);if(dirname(file)!==mediaDirectory||!existsSync(file))return json(res,404,{error:'Файл недоступен'});return serve(req,res,file);}
   if(mutation)return json(res,404,{error:'Адрес не найден'});
   const name=pathname==='/'?(viewer?'overlay.html':'index.html'):pathname.slice(1);
   const allowed=new Set(['index.html','local-audio.js','motion.js','control.js','control.css','shared.css','overlay.html','overlay.js','overlay.css','assets/onest-cyrillic.woff2','assets/onest-latin.woff2','assets/bodoni-0.woff2']);
   if(!allowed.has(name))return json(res,404,{error:'Адрес не найден'});const file=join(ROOT,'public',name);if(!existsSync(file))return json(res,404,{error:'Файл не найден'});serve(req,res,file);
  }catch(error){if(!res.headersSent)json(res,400,{error:error.message||'Не удалось выполнить действие'});else res.destroy();}
 });
 let maintenance;if(startWorkers){twitch.start();yandex.start();vk.start();background.start();work();maintenance=setInterval(()=>{work();media.prune(queue);},60000);maintenance.unref();}
 return {server,queue,twitch,yandex,vk,media,background,viewerToken,close(){clearInterval(maintenance);twitch.close();yandex.close();vk.close();background.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const configPath=process.env.ANKUZO_MUSIC_CONFIG;const config=configPath?JSON.parse(readFileSync(configPath,'utf8')):{};const dev=process.env.LOCAL_DEV==='1';
 if(!dev&&!config.adminKey)throw Error('Administrator key is required');
 const app=createApp({directory:process.env.DATA_DIR||join(ROOT,'data'),adminKey:config.adminKey,dev,config,origin:config.origin||'https://ankuzo.online'});
 app.server.listen(Number(process.env.PORT||17223),dev?'127.0.0.1':'0.0.0.0',()=>console.log('Ankuzo music service ready'));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{app.close();app.queue.pause();app.server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
}
