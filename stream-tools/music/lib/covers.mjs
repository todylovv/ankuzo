import {writeFileSync} from 'node:fs';import {join} from 'node:path';
const LIMIT=2*1024*1024;
export async function cacheCover({directory,id,url,fetcher=fetch}){
 const u=new URL(url);
 if(!/^[a-f0-9-]{36}$/.test(id)||u.protocol!=='https:'||u.username||u.password||u.port||!/(?:^|\.)(ytimg\.com|avatars\.yandex\.net|avatars\.mds\.yandex\.net|userapi\.com|vkuserphoto\.ru|vkuserphoto\.net|vk-cdn\.net)$/.test(u.hostname))throw Error('Недопустимый адрес обложки');
 const response=await fetcher(u.href,{redirect:'error',signal:AbortSignal.timeout(15000)});
 const type=(response.headers.get('content-type')||'').split(';')[0].trim();const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type];
 if(!response.ok||!extension||Number(response.headers.get('content-length'))>LIMIT){await response.body?.cancel();throw Error('Обложка недоступна');}
 const reader=response.body.getReader();const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw Error('Обложка слишком большая');}chunks.push(value);}
 const image=Buffer.concat(chunks);
 const valid=extension==='jpg'?image[0]===255&&image[1]===216&&image[2]===255:extension==='png'?image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):image.subarray(0,4).toString()==='RIFF'&&image.subarray(8,12).toString()==='WEBP';
 if(!valid)throw Error('Не удалось прочитать обложку');
 const filename=id+'.cover.'+extension;writeFileSync(join(directory,filename),image,{mode:0o600});return filename;
}
