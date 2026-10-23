import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync,existsSync,statSync,readdirSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
const execute=promisify(execFile);
import {cacheCover} from './covers.mjs';
export function assertFullTrack(expected,actual){if(!Number.isFinite(actual)||actual<1||actual<expected-Math.max(3,expected*.04))throw Error('Источник отдал только фрагмент трека. Подключите аккаунт сервиса в настройках');}
export function parseSource(value){
 if(typeof value!=='string'||value.length>2048)throw Error('Вставьте ссылку на трек или клип');
 let u;try{u=new URL(value.trim());}catch{throw Error('Не удалось прочитать ссылку');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Нужна обычная HTTPS-ссылка на поддерживаемый сервис');
 const host=u.hostname.toLowerCase();let id;
 if(u.searchParams.has('list')||/\/(?:album|playlist|artist|users)(?:\/|$)/.test(u.pathname)&&!/^\/album\/\d+\/track\/\d+\/?$/.test(u.pathname))throw Error('Принимается только один трек. Альбомы и плейлисты не принимаются');
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(host)){
  id=host.endsWith('youtu.be')?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})\/?$/)?.[1];
  if(!/^[\w-]{11}$/.test(id||''))throw Error('Нужна ссылка на один ролик YouTube');
  return {provider:'youtube',url:'https://www.youtube.com/watch?v='+id};
 }
 if(['vk.com','www.vk.com','m.vk.com','vk.ru','www.vk.ru','m.vk.ru','vkvideo.ru','www.vkvideo.ru'].includes(host)){
  const audio=u.pathname.match(/^\/audio(-?\d+_\d+(?:_[a-f0-9]{8,64})?)\/?$/)?.[1];if(audio)return {provider:'vkAudio',url:'https://vk.ru/audio'+audio};
  const video=u.pathname.match(/^\/video(-?\d+_\d+)\/?$/)?.[1]||u.searchParams.get('z')?.match(/^video(-?\d+_\d+)/)?.[1];
  if(!video)throw Error('Нужна ссылка на видео VK');return {provider:'vk',url:'https://vk.com/video'+video};
 }
 if(host==='open.spotify.com'&&(id=u.pathname.match(/^\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]+)\/?$/)?.[1]))return {provider:'spotify',url:'https://open.spotify.com/track/'+id};
 if(['music.yandex.ru','music.yandex.com','music.yandex.kz','music.yandex.by'].includes(host)&&(id=u.pathname.match(/^\/album\/(\d+)\/track\/(\d+)\/?$/)))return {provider:'yandex',url:`https://music.yandex.ru/album/${id[1]}/track/${id[2]}`};
 throw Error('Поддерживаются ссылки на треки YouTube, VK, Spotify и Яндекс Музыки');
}
export class Media {
 constructor({directory,executable='yt-dlp',run=execute,fetcher=fetch,yandex=null,vk=null}={}){this.directory=directory;this.executable=executable;this.run=run;this.fetcher=fetcher;this.yandex=yandex;this.vk=vk;this.busy=false;mkdirSync(directory,{recursive:true});}
 async command(args,timeout=60000){try{return (await this.run(this.executable,['--ignore-config','--no-playlist','--no-warnings','--js-runtimes','node','--socket-timeout','12','--retries','1','--extractor-retries','1',...args],{timeout,maxBuffer:5*1024*1024,windowsHide:true})).stdout;}catch{throw Error('Источник не отдал трек. Он может требовать входа или быть недоступен с сервера');}}
 async prepare(item,settings){
  if(item.lane==='background')settings={...settings,maxDuration:1800};
  if(item.reuse&&item.filename&&existsSync(join(this.directory,item.filename)))return {title:item.title,duration:item.duration,filename:item.filename,coverFilename:item.coverFilename||null,coverCheckedAt:item.coverCheckedAt||Date.now(),resolvedProvider:item.resolvedProvider||item.provider};
  if(item.provider==='yandex'&&this.yandex){const result=await this.yandex.prepare(item,settings);await this.verifyAudio(result);return this.withCover(item,result);}
  if(item.provider==='vkAudio'){if(!this.vk)throw Error('Подключите VK Музыку в настройках');const result=await this.vk.prepare(item,settings);await this.verifyAudio(result);return this.withCover(item,result);}
  let url=item.url;let substituted=false;
  if(item.provider==='spotify'){
   if(!settings.allowSearch)throw Error('Для Spotify включите «Искать версию на YouTube» в настройках');
   const response=await this.fetcher('https://open.spotify.com/oembed?url='+encodeURIComponent(url),{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Spotify не отдал название трека');const data=await response.json();
   if(typeof data.title!=='string'||data.title.length>500)throw Error('Не удалось определить название трека');
   url='ytsearch1:'+data.title+' audio';substituted=true;
  }
  let metadata=JSON.parse(await this.command(['--skip-download','--dump-single-json','--',url]));
  if(metadata.entries){if(!substituted)throw Error('Принимается только один трек. Альбомы и плейлисты не принимаются');metadata=metadata.entries[0];}
  if(!metadata||metadata.is_live||metadata.live_status==='is_live'||!Number.isFinite(metadata.duration)||metadata.duration<1)throw Error('Нужен обычный трек или клип с известной длительностью');
  if(metadata.duration>settings.maxDuration)throw Error(`Трек длиннее лимита (${Math.floor(settings.maxDuration/60)} мин)`);
  if(substituted){url='https://www.youtube.com/watch?v='+metadata.id;parseSource(url);}
  const template=join(this.directory,item.id+'.%(ext)s');
  await this.command(['--max-filesize','150M','-f','bv*[height<=480][vcodec^=avc1]+ba[acodec^=mp4a]/b[height<=480][ext=mp4]/b[ext=mp4]/bestaudio[ext=m4a]/bestaudio','--merge-output-format','mp4','--remux-video','mp4','-o',template,'--',url],180000);
  const filename=readdirSync(this.directory).find(x=>x.startsWith(item.id+'.')&&/\.(mp4|m4a|webm|mp3|opus)$/.test(x));
  if(!filename||!existsSync(join(this.directory,filename))||statSync(join(this.directory,filename)).size<100)throw Error('Источник не отдал пригодный для воспроизведения файл');
  return this.withCover(item,{title:String(metadata.title||'Без названия').slice(0,240),duration:Math.ceil(metadata.duration),filename,substituted,resolvedProvider:substituted?'youtube':item.provider,coverUrl:metadata.thumbnail});
 }
 async withCover(item,result){const {coverUrl,...media}=result;let coverFilename=null;if(coverUrl)try{coverFilename=await cacheCover({directory:this.directory,id:item.id,url:coverUrl,fetcher:this.fetcher});}catch{}return {...media,coverFilename,coverCheckedAt:Date.now()};}
 async backfillCovers(queue){for(const item of queue.allItems().filter(x=>['playing','ready'].includes(x.status)&&!x.coverFilename&&!x.coverCheckedAt)){
  let coverUrl=null;try{if(item.provider==='yandex')coverUrl=await this.yandex?.cover(item);else if(item.provider==='vkAudio')coverUrl=await this.vk?.cover(item);else if(item.provider==='youtube')coverUrl='https://i.ytimg.com/vi/'+new URL(item.url).searchParams.get('v')+'/hqdefault.jpg';
   const result=await this.withCover(item,{coverUrl});if(queue.findItem(item.id))queue.artwork(item.id,result.coverFilename);
  }catch{if(queue.findItem(item.id))queue.artwork(item.id,null);}
 }}
 async verifyAudio(media){const {stdout}=await this.run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',join(this.directory,media.filename)],{timeout:10000,maxBuffer:10000});assertFullTrack(media.duration,Number(JSON.parse(stdout).format.duration));}
 async work(queue,onFailure){
  if(this.busy)return;this.busy=true;
  try{for(;;){const item=queue.allItems().find(x=>x.status==='resolving');if(!item)break;try{const result=await this.prepare(item,queue.state.settings);if(queue.findItem(item.id))queue.ready(item.id,result);}catch(error){if(!queue.findItem(item.id))continue;queue.fail(item.id,error.message);if(item.redemptionId&&queue.state.settings.autoRefund)await onFailure(item).catch(()=>{});}}await this.backfillCovers(queue);}finally{this.busy=false;}
 }
 prune(queue){
  const keep=new Set(queue.allItems().filter(x=>['resolving','ready','playing'].includes(x.status)).flatMap(x=>[x.filename,x.coverFilename]));
  const files=readdirSync(this.directory).map(name=>({name,...statSync(join(this.directory,name))})).sort((a,b)=>b.mtimeMs-a.mtimeMs);let size=0;
  for(const file of files){size+=file.size;const preparing=queue.allItems().some(x=>x.status==='resolving'&&file.name.startsWith(x.id+'.'));if(!preparing&&!keep.has(file.name)&&(size>2*1024**3||Date.now()-file.mtimeMs>24*3600000))unlinkSync(join(this.directory,file.name));}
 }
}
