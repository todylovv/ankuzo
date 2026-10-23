import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {join} from 'node:path';
const execute=promisify(execFile);
export class VK {
 constructor({key,directory,endpoint='http://ankuzo-music-vk:17225',fetcher=fetch,run=execute}={}){this.key=key;this.directory=directory;this.endpoint=endpoint;this.fetcher=fetcher;this.run=run;this.current={connected:false,pending:false};this.timer=null;this.busy=false;}
 status(){return structuredClone(this.current);}
 async request(path,body){const r=await this.fetcher(this.endpoint+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(75000)});if(!r.ok){let data;try{data=await r.json();}catch{}throw Error(data?.error||'VK не ответил. Повторите попытку');}return r;}
 async connect(){this.current=await (await this.request('/connect',{})).json();return this.status();}
 async qr(){return Buffer.from(await (await this.request('/qr')).arrayBuffer());}
 async poll(){if(this.busy)return;this.busy=true;try{this.current=await (await this.request('/status')).json();}catch{this.current.error='Подключение VK временно недоступно';}finally{this.busy=false;}}
 async prepare(item,settings){
  const media=await (await this.request('/resolve',{url:item.url,maxDuration:settings.maxDuration})).json();
  const u=new URL(media.url);if(u.protocol!=='https:'||!/(?:^|\.)(vkuseraudio\.(ru|net)|userapi\.com|vk-cdn\.net)$/.test(u.hostname))throw Error('VK вернул неподдерживаемый адрес аудио');
  const filename=item.id+'.m4a';
  try{await this.run('ffmpeg',['-nostdin','-v','error','-y','-rw_timeout','15000000','-i',media.url,'-vn','-c:a','aac','-b:a','192k','-fs','157286400','-movflags','+faststart',join(this.directory,filename)],{timeout:180000,maxBuffer:100000});}catch{throw Error('Не удалось загрузить трек VK с сервера');}
  return {title:String(media.title).slice(0,240),duration:media.duration,filename,resolvedProvider:'vkAudio',substituted:false,coverUrl:media.coverUrl};
 }
 async cover(item){return (await (await this.request('/resolve',{url:item.url,maxDuration:1800})).json()).coverUrl;}
 start(){this.poll();this.timer=setInterval(()=>this.poll(),5000);this.timer.unref();}
 close(){clearInterval(this.timer);}
}
