import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const execute=promisify(execFile);const helper=join(dirname(fileURLToPath(import.meta.url)),'yandex_bridge.py');const libraryHelper=join(dirname(helper),'yandex_library.py');
export class Yandex {
 constructor({directory,python='/venv/bin/python',run=execute}={}){this.directory=directory;this.python=python;this.run=run;this.current={connected:false,login:null,pending:null};this.busy=false;this.timer=null;}
 status(){return structuredClone(this.current);}
 async command(action,...args){let out;try{out=(await this.run(this.python,[['library','search','catalog','wave','feedback'].includes(action)?libraryHelper:helper,action,this.directory,...args.map(String)],{timeout:action==='prepare'?180000:25000,maxBuffer:2*1024*1024,windowsHide:true})).stdout;}catch(e){let failure;try{failure=JSON.parse(e.stdout);}catch{}throw Error(failure?.error||'Яндекс Музыка не ответила. Повторите попытку');}const data=JSON.parse(out);if(!data.ok)throw Error(data.error);return data;}
 async connect(){this.current=await this.command('connect');return this.status();}
 async poll(){if(this.busy)return;this.busy=true;try{this.current=await this.command('poll');}catch(error){this.current.error=error.message;}finally{this.busy=false;}}
 async prepare(item,settings){const u=new URL(item.url);const match=u.pathname.match(/^\/album\/(\d+)\/track\/(\d+)$/);if(!match)throw Error('Нужна ссылка на один трек Яндекс Музыки');return this.command('prepare',match[2]+':'+match[1],item.id,settings.maxDuration);}
 async cover(item){const m=new URL(item.url).pathname.match(/^\/album\/(\d+)\/track\/(\d+)$/);return m?(await this.command('cover',m[2]+':'+m[1])).coverUrl:null;}
 async library(){return this.command('library');}
 async search(query){return this.command('search',query);}
 async catalog(spec){return this.command('catalog',JSON.stringify(spec));}
 async wave(session=null,queue=[]){return this.command('wave',JSON.stringify({session,queue}));}
 async feedback(event){return this.command('feedback',JSON.stringify(event));}
 start(){this.poll();this.timer=setInterval(()=>this.poll(),6000);this.timer.unref();}
 close(){clearInterval(this.timer);}
}
