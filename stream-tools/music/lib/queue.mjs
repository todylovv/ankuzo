import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {parseSource} from './media.mjs';

const defaults={showVideo:true,autoPlay:true,volume:0.7,maxDuration:600,maxQueue:40,autoRefund:true,allowSearch:false,rewardTitle:'Заказать музыку',rewardCost:500};
const terminal=new Set(['played','rejected','error']);
const emptyBackground=()=>({enabled:false,kind:null,title:'',sourceKey:null,generation:0,tracks:[],index:0,items:[],radioSession:null,error:null});
export class Queue {
 constructor({file=null,now=Date.now}={}){
  this.file=file;this.now=now;this.refunds=new Map();this.lease=null;this.backgroundEvents=[];
  this.state={version:2,background:emptyBackground(),items:[],settings:{...defaults},currentId:null,playing:false,position:0,changedAt:now(),revision:0,epoch:0};
  if(file){try{this.state=JSON.parse(readFileSync(file,'utf8'));this.state.settings={...defaults,...this.state.settings};this.state.playing=false;for(const item of this.state.items){if(item.refund==='pending')item.refund='retry';}}catch(e){if(e.code!=='ENOENT')throw e;}}
  this.state.background={...emptyBackground(),...this.state.background};this.state.version=2;
 }
 save(){this.state.revision++;if(this.file){mkdirSync(dirname(this.file),{recursive:true});const temp=this.file+'.tmp';writeFileSync(temp,JSON.stringify(this.state),{mode:0o600});renameSync(temp,this.file);}}
 allItems(){return [...this.state.items,...this.state.background.items];}
 findItem(id){return this.allItems().find(x=>x.id===id)||null;}
 item(id){const item=this.findItem(id);if(!item)throw Error('Заявка не найдена');return item;}
 position(){return this.state.currentId?Math.min(this.item(this.state.currentId).duration||36000,this.state.position):0;}
 snapshot(){const active=this.lease&&this.lease.until>this.now();const {background:b,...base}=this.state;return structuredClone({...base,background:{enabled:b.enabled,kind:b.kind,title:b.title,index:b.index,total:b.tracks.length,generation:b.generation,error:b.error,nextTitle:b.tracks[b.index]?.title||null},current:this.state.currentId?this.item(this.state.currentId):null,position:this.position(),serverNow:this.now(),playerConnected:Boolean(active),playerKind:active?this.lease.kind:null});}
 add(input){
  if(input.redemptionId){const found=this.state.items.find(x=>x.redemptionId===input.redemptionId);if(found)return structuredClone(found);}
  const source=parseSource(input.url);
  if(this.state.items.filter(x=>!terminal.has(x.status)).length>=this.state.settings.maxQueue)throw Error('Очередь заполнена. Попробуйте позже');
  const item={id:randomUUID(),...source,user:String(input.user||'Ankuzo').slice(0,60),title:'Получаем название…',status:'resolving',createdAt:this.now(),redemptionId:input.redemptionId||null,rewardId:input.rewardId||null,refund:'none',settled:false};
  this.state.items.push(item);
  // Keep pending Twitch settlements and recent history; never discard refundable orders.
  if(this.state.items.length>500)this.state.items=this.state.items.filter((x,i)=>!terminal.has(x.status)||(x.redemptionId&&!x.settled)||i>=this.state.items.length-300);
  this.save();return structuredClone(item);
 }
 invalid(input,message){
  const found=this.state.items.find(x=>x.redemptionId===input.redemptionId);if(found)return found;
  const item={id:randomUUID(),provider:'unknown',url:null,user:String(input.user||'Зритель').slice(0,60),title:'Заявка отклонена',status:'error',error:String(message).slice(0,240),createdAt:this.now(),redemptionId:input.redemptionId,rewardId:input.rewardId,refund:'none',settled:false};this.state.items.push(item);this.save();return item;
 }
 move(id,beforeId){
  const queued=this.state.items.filter(x=>['ready','resolving'].includes(x.status));const moving=queued.find(x=>x.id===id);if(!moving)throw Error('Перемещать можно только ожидающие заказы');if(beforeId===id)return;
  if(beforeId!==null&&!queued.some(x=>x.id===beforeId))throw Error('Очередь изменилась. Повторите перемещение');const ordered=queued.filter(x=>x.id!==id);ordered.splice(beforeId===null?ordered.length:ordered.findIndex(x=>x.id===beforeId),0,moving);let index=0;this.state.items=this.state.items.map(x=>['ready','resolving'].includes(x.status)?ordered[index++]:x);this.save();
 }
 backgroundSet({kind,title,tracks,sourceKey=null,radioSession=null}){
  if(!['wave','likes','playlist','track'].includes(kind)||!Array.isArray(tracks)||!tracks.length)throw Error('Источник фона не содержит доступных треков');
  const catalog=tracks.slice(0,500).map(t=>{const source=parseSource(t.url);if(source.provider!=='yandex')throw Error('Фон использует треки Яндекс Музыки');return {...t,...source,title:String(t.title||'Трек Яндекс Музыки').slice(0,240)};});
  const old=this.state.background;const current=this.state.currentId?this.item(this.state.currentId):null;
  if(current?.lane==='background'){this.backgroundEvent('skip',current);this.state.currentId=null;this.state.position=0;this.state.epoch++;}
  this.state.background={...emptyBackground(),enabled:true,kind,title:String(title||'Яндекс Музыка').slice(0,120),sourceKey,generation:old.generation+1,tracks:catalog,radioSession};this.maybeStart();this.save();
 }
 backgroundEnsure(index){
  const b=this.state.background;if(!Number.isInteger(index)||index<0||index>=b.tracks.length)throw Error('Фоновый трек пока не подготовлен');let item=b.items.find(x=>x.backgroundIndex===index);
  if(item){if(['played','error'].includes(item.status)){item.reuse=item.status==='played'&&Boolean(item.filename);item.status='resolving';delete item.error;this.save();}return structuredClone(item);}
  const track=b.tracks[index];item={...track,id:randomUUID(),provider:'yandex',lane:'background',user:'Фоновая музыка',status:'resolving',backgroundIndex:index,generation:b.generation,createdAt:this.now(),redemptionId:null,refund:'none',settled:false};b.items.push(item);this.save();return structuredClone(item);
 }
 backgroundStep(direction){
  if(![-1,1].includes(direction)||!this.state.background.enabled)throw Error('Сначала включите фоновую музыку');const b=this.state.background;const current=this.state.currentId?this.item(this.state.currentId):null;
  if(current?.lane==='background'){this.backgroundEvent('skip',current);current.status='played';this.state.currentId=null;this.state.position=0;this.state.epoch++;}
  b.index=b.kind==='wave'?Math.max(0,Math.min(b.tracks.length,b.index+direction)):(b.index+direction+b.tracks.length)%b.tracks.length;b.error=null;this.maybeStart();this.save();
 }
 backgroundStop(){const b=this.state.background;const current=this.state.currentId?this.item(this.state.currentId):null;b.enabled=false;if(current?.lane==='background'){this.backgroundEvent('skip',current);current.status='played';this.state.currentId=null;this.state.position=0;this.state.epoch++;}this.maybeStart();this.save();}
 backgroundAppend(tracks,radioSession){const b=this.state.background;const room=500-b.tracks.length;for(const t of tracks.slice(0,room)){const source=parseSource(t.url);if(source.provider==='yandex')b.tracks.push({...t,...source});}if(radioSession)b.radioSession=radioSession;b.error=null;this.save();}
 backgroundEvent(type,item){if(item.radioSessionId)this.backgroundEvents.push({type,trackId:item.trackId||new URL(item.url).pathname.match(/track\/(\d+)/)?.[1],radioSessionId:item.radioSessionId,batchId:item.batchId||null,seconds:Math.min(1800,Number(this.state.listenedSeconds)||0)});if(this.backgroundEvents.length>40)this.backgroundEvents.shift();}
 drainBackgroundEvents(){return this.backgroundEvents.splice(0);}
 settings(patch){
  const next={...this.state.settings};
  for(const [key,value] of Object.entries(patch)){
   if(!(key in defaults))throw Error('Неизвестная настройка');
   if(['showVideo','autoRefund','allowSearch','autoPlay'].includes(key)&&typeof value!=='boolean')throw Error('Некорректный переключатель');
   if(key==='volume'&&(!Number.isFinite(value)||value<0||value>1))throw Error('Громкость должна быть от 0 до 100%');
   if(key==='maxDuration'&&(!Number.isInteger(value)||value<15||value>1800))throw Error('Длительность должна быть от 15 до 1800 секунд');
   if(key==='maxQueue'&&(!Number.isInteger(value)||value<1||value>100))throw Error('Очередь должна вмещать от 1 до 100 треков');
   if(key==='rewardCost'&&(!Number.isInteger(value)||value<1||value>1000000))throw Error('Укажите стоимость от 1 до 1000000 баллов');
   if(key==='rewardTitle'&&(typeof value!=='string'||!value.trim()||value.length>45))throw Error('Название награды: от 1 до 45 символов');
   next[key]=value;
  }
  this.state.settings=next;this.save();return next;
 }
 ready(id,media){const item=this.item(id);if(item.status!=='resolving')return;Object.assign(item,media,{status:'ready'});this.maybeStart();this.save();}
 artwork(id,filename){const item=this.item(id);item.coverFilename=filename;item.coverCheckedAt=this.now();this.save();}
 fail(id,message){const item=this.item(id);if(!['resolving','ready','playing'].includes(item.status))return;Object.assign(item,{status:'error',error:String(message).slice(0,240)});if(this.state.currentId===id)this.advance(false,{automatic:true});this.maybeStart();this.save();}
 maybeStart(){
  if(this.state.currentId||!this.state.playing)return;
  const order=this.state.items.find(x=>['resolving','ready'].includes(x.status));const b=this.state.background;const first=order||(b.enabled?b.items.find(x=>x.backgroundIndex===b.index&&x.status==='ready'):null);
  if(first?.status==='ready'){first.status='playing';this.state.currentId=first.id;this.state.position=0;this.state.listenedSeconds=0;first.feedbackStarted=false;this.state.changedAt=this.now();}
 }
 play(){if(this.state.playing)return;this.state.playing=true;this.state.epoch=(this.state.epoch||0)+1;this.state.changedAt=this.now();this.maybeStart();this.save();}
 pause(){this.state.position=this.position();this.state.playing=false;this.state.epoch=(this.state.epoch||0)+1;this.state.changedAt=this.now();this.save();}
 seek(position){if(!this.state.currentId||!Number.isFinite(position))throw Error('Нет текущего трека');this.state.position=Math.max(0,Math.min(position,this.item(this.state.currentId).duration));this.state.epoch=(this.state.epoch||0)+1;this.state.changedAt=this.now();this.save();}
 advance(mark=true,{automatic=false}={}){if(automatic&&!this.state.settings.autoPlay)this.state.playing=false;if(this.state.currentId){const item=this.item(this.state.currentId);if(item.lane==='background'){this.backgroundEvent(automatic&&mark?'finished':'skip',item);const b=this.state.background;b.index=b.kind==='wave'?item.backgroundIndex+1:(item.backgroundIndex+1)%b.tracks.length;}if(mark)item.status='played';this.state.currentId=null;}this.state.position=0;this.state.epoch=(this.state.epoch||0)+1;this.state.changedAt=this.now();this.maybeStart();this.save();}
 skip(){this.advance();}
 reject(id){const item=this.item(id);if(item.redemptionId&&!item.settled)throw Error('Используйте «Вернуть баллы» для этой заявки');item.status='rejected';if(this.state.currentId===id)this.advance(false);this.maybeStart();this.save();}
 heartbeat(player,kind='obs'){
  if(typeof player!=='string'||!/^[\w-]{8,80}$/.test(player))throw Error('Некорректный плеер');
  if(!['obs','preview'].includes(kind))throw Error('Некорректный тип плеера');
  if(!this.lease||this.lease.until<this.now()||this.lease.player===player||(kind==='obs'&&this.lease.kind==='preview')){this.lease={player,kind,until:this.now()+7000};return {owner:true};}
  return {owner:false};
 }
 release(player){if(this.lease?.player===player)this.lease=null;}
 playerEvent(player,event){
  if(this.lease?.player!==player||this.lease.until<this.now()||event.id!==this.state.currentId)return false;
  if(event.epoch!==undefined&&event.epoch!==this.state.epoch)return false;
  if(event.type==='ended'&&this.state.playing)this.advance(true,{automatic:true});
  else if(event.type==='error')this.fail(event.id,'Не удалось воспроизвести файл. Попробуйте другой источник');
  else if(event.type==='progress'&&Number.isFinite(event.position)){const item=this.item(event.id);const position=Math.max(0,Math.min(event.position,item.duration));if(this.state.playing){this.state.listenedSeconds=(this.state.listenedSeconds||0)+Math.max(0,Math.min(5,position-this.state.position));if(item.lane==='background'&&!item.feedbackStarted&&position>this.state.position){item.feedbackStarted=true;this.backgroundEvent('started',item);}}this.state.position=position;this.state.changedAt=this.now();}
  return true;
 }
 async refund(id,perform){
  const item=this.item(id);if(!item.redemptionId)throw Error('Эта заявка добавлена вручную');if(item.refund==='returned')return;if(item.settled)throw Error('Twitch уже закрыл эту заявку');
  if(this.refunds.has(id))return this.refunds.get(id);
  item.refund='pending';this.save();
  const operation=(async()=>{try{await perform(item);item.refund='returned';item.settled=true;item.status='rejected';delete item.refundError;if(this.state.currentId===id)this.advance(false);this.maybeStart();this.save();}catch(error){item.refund='retry';item.refundError='Возврат не подтверждён. Повторите попытку';this.save();throw error;}finally{this.refunds.delete(id);}})();
  this.refunds.set(id,operation);return operation;
 }
 async complete(id,perform){const item=this.item(id);if(!item.redemptionId||item.settled)return;await perform(item);item.settled=true;this.save();}
}
