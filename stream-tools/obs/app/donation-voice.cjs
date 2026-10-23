'use strict';
const {randomBytes}=require('node:crypto');
const MAX_BYTES=5*1024*1024,MAX_TOTAL=32*1024*1024;
function createVoiceStore({fetchImpl=fetch,now=Date.now}={}){
 const assets=new Map();let total=0;
 const prune=()=>{for(const [id,item]of assets)if(item.expiresAt<=now()){total-=item.bytes.length;assets.delete(id);}};
 async function fromBuffer(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<44||bytes.length>MAX_BYTES)throw new Error('Аудиосообщение: файл до 5 МБ.');
  let mime;
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE')mime='audio/wav';
  else if(bytes.toString('ascii',0,4)==='OggS')mime='audio/ogg';
  else if(bytes.toString('ascii',4,8)==='ftyp')mime='audio/mp4';
  else if(bytes.readUInt32BE(0)===0x1a45dfa3)mime='audio/webm';
  else if(bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224))mime='audio/mpeg';
  else throw new Error('Не удалось распознать аудиосообщение.');
  const {parseBuffer}=require('./vendor/audio-metadata.cjs');
  const result=await parseBuffer(bytes,{mimeType:mime,size:bytes.length},{duration:true,skipCovers:true});
  const seconds=result.format.duration;
  if(!Number.isFinite(seconds)||seconds<=0||seconds>120)throw new Error('Аудиосообщение должно длиться не больше двух минут.');
  return {bytes,mime,durationMs:Math.ceil(seconds*1000)};
 }
 async function load(value){
  let url;try{url=new URL(value);}catch{throw new Error('Не удалось открыть аудиосообщение DonationAlerts.');}
  const host=url.hostname,allowed=['donationalerts.com','donationalerts.ru'].some(domain=>host===domain||host.endsWith('.'+domain));
  if(!allowed||url.protocol!=='https:'||url.username||url.password||url.hash||(url.port&&url.port!=='443')||url.href.length>2048)throw new Error('Неподдерживаемый адрес аудиосообщения DonationAlerts.');
  const response=await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok||!response.body)throw new Error('Аудиосообщение временно недоступно.');
  const length=Number(response.headers.get('content-length'));
  if(length>MAX_BYTES){await response.body.cancel();throw new Error('Аудиосообщение слишком большое.');}
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>MAX_BYTES){await reader.cancel();throw new Error('Аудиосообщение слишком большое.');}chunks.push(Buffer.from(item.value));}}finally{reader.releaseLock();}
  return fromBuffer(Buffer.concat(chunks,size));
 }
 function put(item){prune();if(total+item.bytes.length>MAX_TOTAL)throw new Error('Очередь аудиосообщений заполнена.');const id=randomBytes(18).toString('base64url');assets.set(id,{...item,expiresAt:now()+120000});total+=item.bytes.length;return {id,durationMs:item.durationMs};}
 return {load,fromBuffer,put,get(id){prune();return assets.get(id);},retain(id,until){const item=assets.get(id);if(item)item.expiresAt=until;},remove(id){const item=assets.get(id);if(item){total-=item.bytes.length;assets.delete(id);}},close(){assets.clear();total=0;}};
}
module.exports={createVoiceStore};
