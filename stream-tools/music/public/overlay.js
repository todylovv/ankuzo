import {morphGroup} from './motion.js';
const $=id=>document.getElementById(id);const video=$('video');const player=crypto.randomUUID();let busy=false,current=null,owner=false,unlock=false,event=null,lastState=null,pendingSeek=null;
const source={youtube:'YouTube',vk:'VK',vkAudio:'VK Музыка',spotify:'Spotify',yandex:'Яндекс Музыка'};
video.addEventListener('ended',()=>{if(owner&&current)event={type:'ended',id:current.id,epoch:lastState?.epoch};tick();});
video.addEventListener('error',()=>{if(owner&&current&&video.getAttribute('src')){event={type:'error',id:current.id,epoch:lastState?.epoch};tick();}});
$('unlock').addEventListener('click',async()=>{try{await video.play();unlock=false;$('unlock').hidden=true;}catch{}});
function applySeek(){if(pendingSeek!==null&&Number.isFinite(video.duration)){const position=pendingSeek;pendingSeek=null;if(Math.abs(video.currentTime-position)>.4)video.currentTime=Math.max(0,Math.min(position,video.duration));}}
video.addEventListener('loadedmetadata',applySeek);
function render(state){
 const epochChanged=lastState?.epoch!==state.epoch;lastState=state;const wasOwner=owner;owner=state.owner;const item=state.current;current=item;
 if(!owner){video.pause();video.muted=true;$('dock').hidden=true;$('unlock').hidden=true;return;}
 $('notice').hidden=true;$('dock').hidden=!item;const audio=!state.settings.showVideo||['yandex','vkAudio'].includes(item?.provider);const layout=()=>{$('dock').classList.toggle('audio',audio);};if(item&&wasOwner&&$('dock').classList.contains('audio')!==audio)morphGroup([$('dock')],layout);else layout();video.volume=state.settings.volume;video.muted=false;
 if(!item){video.pause();video.removeAttribute('src');delete video.dataset.id;video.load();return;}
 const art=item.hasCover?'cover/'+item.id:'';if($('cover').dataset.art!==art){$('cover').dataset.art=art;$('cover').hidden=!art;$('cover-mark').hidden=Boolean(art);if(art)$('cover').src=art;else $('cover').removeAttribute('src');}
 $('title').textContent=item.title;$('user').textContent=item.lane==='background'?'Фоновая музыка':'Заказал '+item.user;$('source').textContent=item.substituted?'YouTube':source[item.provider]||'';
 const changed=video.dataset.id!==item.id;if(changed){video.dataset.id=item.id;video.src='media/'+item.id;video.load();unlock=false;}
 if(changed||epochChanged||!wasOwner)pendingSeek=state.position;applySeek();
 if(state.playing){if(video.paused&&!video.ended)video.play().then(()=>{$('unlock').hidden=true;unlock=false;}).catch(()=>{unlock=true;$('unlock').hidden=false;});}
 else{video.pause();$('unlock').hidden=true;}
}
async function tick(){
 if(busy)return;busy=true;
 try{
  const pendingEvent=event||(owner&&current&&!video.paused&&!video.seeking&&video.readyState>=3?{type:'progress',id:current.id,position:video.currentTime,epoch:lastState?.epoch}:null);
  const response=await fetch('api/player',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Ankuzo-Music':'1'},body:JSON.stringify({player,event:pendingEvent})});
  if(!response.ok)throw Error('Нет доступа к виджету');const state=await response.json();if(event===pendingEvent)event=null;render(state);
 }catch{video.pause();$('notice').textContent='Нет связи с музыкальным виджетом. Переподключаемся…';$('notice').hidden=false;}finally{busy=false;}
}
addEventListener('pagehide',()=>{fetch('api/player',{method:'POST',keepalive:true,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Ankuzo-Music':'1'},body:JSON.stringify({player,type:'release'})}).catch(()=>{});});
$('cover').addEventListener('error',()=>{$('cover').hidden=true;$('cover-mark').hidden=false;});
tick();setInterval(tick,1500);
