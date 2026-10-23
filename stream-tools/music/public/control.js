import {PersonalAudio} from './local-audio.js';
import {morphHeight} from './motion.js';
const $=id=>document.getElementById(id);
const preview=$('preview-video'),previewPlayer=crypto.randomUUID();let scrubbing=false;let previewOwner=false,previewBusy=false,previewEvent=null,previewSync=true,lastPreviewEpoch=null,pendingPreviewSeek=null;
let state=null,lastRows='',lastSettings='',overlayUrl='',rewardsLoaded=false,pollBusy=false,vkQRStamp='';
const personalAudio=new PersonalAudio(()=>{if(state)render(state);});
let dragging=null,libraryLoaded=false,lastMode=null;
const names={youtube:'YouTube',vk:'VK Видео',vkAudio:'VK Музыка',spotify:'Spotify',yandex:'Яндекс Музыка',unknown:'Twitch'};
const statuses={resolving:'Подготовка',ready:'Готов',playing:'Играет',played:'Прослушан',error:'Не принят',rejected:'Отклонён'};
const time=seconds=>Math.floor(Math.max(0,seconds||0)/60)+':'+String(Math.floor(Math.max(0,seconds||0))%60).padStart(2,'0');
function message(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
async function api(path,values){const response=await fetch('api/'+path,{credentials:'same-origin',cache:'no-store',...(values?{method:'POST',headers:{'Content-Type':'application/json','X-Ankuzo-Music':'1'},body:JSON.stringify(values)}:{})});let data;try{data=await response.json();}catch{throw Error('Нет ответа сервера. Обновите страницу');}if(!response.ok)throw Error(data.error||'Действие не выполнено');return data;}
async function busy(button,fn,feedback='feedback'){
 if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');message(feedback,'');
 try{await fn();}catch(error){message(feedback,error.message,true);}finally{button.disabled=false;button.removeAttribute('aria-busy');}
}
async function command(action,values={}){const result=await api('control',{action,...values});if(result.items)render(result);return result;}
function button(text,action,id,extra=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.action=action;b.dataset.id=id;b.className=extra;return b;}
function trackRow(item,history=false){
 const li=document.createElement('li');li.dataset.id=item.id;const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;copy.append(title);
 const meta=document.createElement('span');meta.className='meta';meta.textContent=[item.user,names[item.provider],item.substituted?'версия YouTube':null,item.duration?time(item.duration):null,statuses[item.status],item.refund==='returned'?'Баллы возвращены':item.settled?'Закрыта':null].filter(Boolean).join(' · ');copy.append(meta);
 if(item.error||item.refundError){const reason=document.createElement('span');reason.className='reason';reason.textContent=item.refundError||item.error;copy.append(reason);}
 const actions=document.createElement('div');actions.className='row-actions';
 if(!history){const order=state.items.filter(x=>['ready','resolving'].includes(x.status));const index=order.findIndex(x=>x.id===item.id);li.draggable=true;li.title='Перетащите трек или используйте стрелки';const up=button('↑','move-up',item.id,'move-button');up.setAttribute('aria-label','Выше: '+item.title);up.disabled=index===0;const down=button('↓','move-down',item.id,'move-button');down.setAttribute('aria-label','Ниже: '+item.title);down.disabled=index===order.length-1;actions.append(up,down);}
 if(item.redemptionId&&!item.settled){const refund=button(item.refund==='pending'?'Возвращаем…':item.refund==='retry'?'Повторить возврат':'Вернуть баллы','refund',item.id,'refund');refund.disabled=item.refund==='pending';actions.append(refund);if(history&&item.status==='played')actions.append(button('Выполнено','complete',item.id));}
 else if(!history)actions.append(button('Убрать','remove',item.id));
 if(item.coverFilename){const image=document.createElement('img');image.src='cover/'+item.id;image.alt='';image.width=36;image.height=36;image.loading='lazy';image.className='queue-cover';copy.classList.add('with-cover');copy.prepend(image);image.addEventListener('error',()=>{image.remove();copy.classList.remove('with-cover');},{once:true});}
 li.append(copy,actions);return li;
}
function render(next){
 if(state&&(next.epoch<state.epoch||next.revision<state.revision))return;
 state=next;const current=state.current;const showVideo=state.settings.showVideo&&!['yandex','vkAudio'].includes(current?.provider);const twitch=state.twitch;const queued=state.items.filter(x=>['ready','resolving'].includes(x.status));const history=state.items.filter(x=>['played','error','rejected'].includes(x.status)).slice(-30).reverse();
 $('twitch-status').textContent=twitch.connected?twitch.error?'Twitch: нужна проверка':'Twitch · '+twitch.login:'Twitch не подключён';document.querySelector('.connection').classList.toggle('connected',twitch.connected&&!twitch.error);$('connect').textContent=twitch.connected?'Переподключить':'Подключить';$('create-reward').disabled=!twitch.connected;
 $('device').hidden=!twitch.pending;if(twitch.pending){$('device-code').textContent=twitch.pending.userCode;$('device-link').href=twitch.pending.verificationUri;}
 $('reward-hint').textContent=twitch.rewardId?'Награда выбрана. Новые заказы проверяются автоматически.':twitch.connected?'Создайте награду с вводом ссылки или выберите существующую.':'Подключите канал кнопкой вверху страницы.';
 const yandex=state.yandex||{};$('yandex-status').textContent=yandex.connected?(yandex.login||'Аккаунт подключён')+(yandex.hasPlus?' · Плюс':''):yandex.error||'Не подключена';$('connect-yandex').textContent=yandex.connected?'Переподключить':'Подключить Яндекс';$('yandex-device').hidden=!yandex.pending;if(yandex.pending){$('yandex-code').textContent=yandex.pending.userCode;$('yandex-link').href=yandex.pending.verificationUri;}
 const vk=state.vk||{};$('vk-status').textContent=vk.connected?'Аккаунт подключён':vk.pending?'Ожидаем подтверждение в VK':'Для полных треков подключите аккаунт';$('connect-vk').textContent=vk.connected?'Проверить подключение':'Подключить VK';$('vk-device').hidden=!vk.pending;if(vk.pending){const stamp=String(Math.floor(Date.now()/10000));if(vkQRStamp!==stamp){$('vk-qr').src='api/vk/qr?t='+stamp;vkQRStamp=stamp;}}
 personalAudio.render();$('obs-volume-value').textContent=Math.round(state.settings.volume*100)+'%';renderBackground();
 $('show-video').checked=state.settings.showVideo;$('auto-play').checked=state.settings.autoPlay;
 if(document.activeElement!==$('volume'))$('volume').value=Math.round(state.settings.volume*100);
 $('queue-count').textContent=queued.length;$('empty-queue').hidden=queued.length>0;
 const rowKey=JSON.stringify(state.items);if(rowKey!==lastRows&&!dragging){const focus=$('queue').contains(document.activeElement)?{...document.activeElement.dataset}:null;$('queue').replaceChildren(...queued.map(x=>trackRow(x)));$('history').replaceChildren(...history.map(x=>trackRow(x,true)));$('history-count').textContent=history.length;$('history-details').hidden=!history.length;lastRows=rowKey;if(focus?.id){const candidates=[...$('queue').querySelectorAll('button')].filter(x=>x.dataset.id===focus.id&&!x.disabled);const target=candidates.find(x=>x.dataset.action===focus.action)||candidates[0];target?.focus({preventScroll:true});}}
 $('play').disabled=!current&&!queued.length&&!state.background?.total;$('skip').disabled=!current;$('play').setAttribute('aria-label',state.playing?'Пауза':'Воспроизвести');$('play-shape').setAttribute('d',state.playing?'M6 5h4v14H6zM14 5h4v14h-4z':'m8 5 11 7-11 7z');
 $('elapsed').textContent=time(state.position);$('duration').textContent=time(current?.duration);$('seek').max=current?.duration||1;$('seek').disabled=!current;if(!scrubbing)$('seek').value=Math.round(state.position||0);
 const video=$('preview-video');const mode=Boolean(current)&&!showVideo;const layout=()=>{$('empty-preview').hidden=Boolean(current);$('now-playing').hidden=!current;$('compact-preview').hidden=!current||showVideo;video.hidden=!current||!showVideo;video.closest('.preview').classList.toggle('audio-only',mode);};
 if(lastMode!==null&&lastMode!==mode)morphHeight(video.closest('.preview'),layout);else layout();lastMode=mode;
 if(current){
  const art=current.coverFilename?'cover/'+current.id:'';if($('compact-cover').dataset.art!==art){$('compact-cover').dataset.art=art;$('compact-cover').hidden=!art;$('compact-mark').hidden=Boolean(art);if(art)$('compact-cover').src=art;else $('compact-cover').removeAttribute('src');}
  $('track-title').textContent=current.title;$('compact-title').textContent=current.title;$('compact-user').textContent=current.lane==='background'?'Фоновая музыка':'Заказал '+current.user;
  $('track-byline').textContent=[current.user,names[current.provider],current.substituted?'версия YouTube':null].filter(Boolean).join(' · ');
  $('current-refund').hidden=!current.redemptionId||current.settled;$('current-refund').dataset.id=current.id;
  const changed=video.dataset.id!==current.id;
  if(changed){video.dataset.id=current.id;video.src='media/'+current.id;video.load();}
  if(changed||lastPreviewEpoch!==state.epoch||previewSync){pendingPreviewSeek=state.position;previewSync=false;}
  else if(!previewOwner&&Number.isFinite(video.duration)&&Math.abs(video.currentTime-state.position)>2)pendingPreviewSeek=state.position;
  lastPreviewEpoch=state.epoch;seekPreview();const canHear=personalAudio.apply(video,previewOwner,state.playerKind);
  if(state.playing&&(previewOwner||showVideo||canHear)){if(video.paused)video.play().then(()=>{$('enable-preview').hidden=true;}).catch(()=>{$('enable-preview').hidden=!canHear;});}
  else{video.pause();$('enable-preview').hidden=true;}
  if(!canHear)$('enable-preview').hidden=true;
 }else if(video.dataset.id){video.pause();video.removeAttribute('src');delete video.dataset.id;video.load();}
 if(!current)$('enable-preview').hidden=true;
 $('player-status').textContent=personalAudio.audible(previewOwner,state.playerKind)?(state.playerKind==='obs'?'OBS воспроизводит · личное прослушивание включено':'Личное прослушивание включено'):(personalAudio.enabled?'Звук открыт в другой вкладке пульта':'Личное прослушивание выключено · звук OBS не меняется');
 overlayUrl=state.overlayUrl;$('overlay-url').value=new URL(overlayUrl,location.href).origin+'/obs/view/music/…';$('copy').disabled=false;$('open-overlay').href=overlayUrl;$('open-overlay').removeAttribute('aria-disabled');
 const settingsKey=JSON.stringify(state.settings);if(settingsKey!==lastSettings&&!$('settings-form').contains(document.activeElement)&&!$('reward-form').contains(document.activeElement)){
  $('max-duration').value=state.settings.maxDuration/60;$('max-queue').value=state.settings.maxQueue;$('auto-refund').checked=state.settings.autoRefund;$('allow-search').checked=state.settings.allowSearch;$('reward-title').value=state.settings.rewardTitle;$('reward-cost').value=state.settings.rewardCost;lastSettings=settingsKey;
 }
 if(twitch.connected&&$('settings').open&&!rewardsLoaded)loadRewards();
}
async function poll(){if(pollBusy)return;pollBusy=true;try{render(await api('state'));if($('feedback').dataset.network==='1'){message('feedback','');delete $('feedback').dataset.network;}}catch{message('feedback','Нет связи с сервером. Переподключаемся…',true);$('feedback').dataset.network='1';}finally{pollBusy=false;}}
$('add-form').addEventListener('submit',event=>{event.preventDefault();busy($('add'),async()=>{await command('add',{url:$('url').value.trim()});$('url').value='';message('add-feedback','Добавлено. Готовим трек на сервере');await poll();},'add-feedback');});
$('play').addEventListener('click',()=>busy($('play'),()=>command(state.playing?'pause':'play')));
$('skip').addEventListener('click',()=>busy($('skip'),()=>command('skip')));
$('seek').addEventListener('input',()=>{scrubbing=true;});
$('seek').addEventListener('change',()=>{scrubbing=false;command('seek',{position:Number($('seek').value)}).catch(e=>message('feedback',e.message,true));});
$('seek').addEventListener('blur',()=>{scrubbing=false;});
$('volume').addEventListener('change',()=>command('settings',{settings:{volume:Number($('volume').value)/100}}).catch(e=>message('feedback',e.message,true)));
$('auto-play').addEventListener('change',()=>command('settings',{settings:{autoPlay:$('auto-play').checked}}).catch(e=>{message('feedback',e.message,true);poll();}));
$('show-video').addEventListener('change',()=>command('settings',{settings:{showVideo:$('show-video').checked}}).catch(e=>{message('feedback',e.message,true);poll();}));
document.addEventListener('click',event=>{const target=event.target.closest('button[data-action]');if(target)busy(target,async()=>{if(target.dataset.action.startsWith('move-')){await moveTrack(target.dataset.id,target.dataset.action==='move-up'?-1:1);return;}await command(target.dataset.action,{id:target.dataset.id});message('feedback',target.dataset.action==='refund'?'Баллы возвращены':'Готово');});});
$('current-refund').addEventListener('click',()=>busy($('current-refund'),async()=>{await command('refund',{id:$('current-refund').dataset.id});message('feedback','Баллы возвращены');}));
$('copy').addEventListener('click',()=>busy($('copy'),async()=>{try{await navigator.clipboard.writeText(new URL(overlayUrl,location.href).href);message('copy-feedback','Ссылка скопирована. Вставьте её в источник «Браузер» OBS');}catch{$('overlay-url').value=new URL(overlayUrl,location.href).href;$('overlay-url').select();message('copy-feedback','Ссылка выделена — нажмите Ctrl+C');}},'copy-feedback'));
$('connect').addEventListener('click',()=>busy($('connect'),async()=>{await api('twitch/connect',{});await poll();}));
$('settings-form').addEventListener('submit',event=>{event.preventDefault();busy($('save-settings'),async()=>{await command('settings',{settings:{maxDuration:Number($('max-duration').value)*60,maxQueue:Number($('max-queue').value),autoRefund:$('auto-refund').checked,allowSearch:$('allow-search').checked}});message('settings-feedback','Настройки сохранены');},'settings-feedback');});
$('reward-form').addEventListener('submit',event=>{event.preventDefault();busy($('create-reward'),async()=>{await command('settings',{settings:{rewardTitle:$('reward-title').value.trim(),rewardCost:Number($('reward-cost').value)}});await api('twitch/reward',{});message('reward-feedback','Награда создана. Зрители могут заказывать треки');rewardsLoaded=false;await poll();},'reward-feedback');});
async function loadRewards(){rewardsLoaded=true;try{const {rewards}=await api('twitch/rewards');const options=rewards.map(x=>{const option=document.createElement('option');option.value=x.id;option.textContent=x.title+' · '+x.cost+' баллов';return option;});const blank=document.createElement('option');blank.value='';blank.textContent='Выберите награду';$('reward-select').replaceChildren(blank,...options);$('reward-select').value=state.twitch.rewardId||'';$('reward-select-wrap').hidden=!rewards.length;}catch(error){message('reward-feedback',error.message,true);rewardsLoaded=false;}}
$('select-reward').addEventListener('click',()=>busy($('select-reward'),async()=>{if(!$('reward-select').value)throw Error('Выберите награду');await api('twitch/reward',{id:$('reward-select').value});message('reward-feedback','Награда подключена');await poll();},'reward-feedback'));
$('settings').addEventListener('toggle',()=>{if($('settings').open&&state?.twitch.connected)loadRewards();});
$('connect-yandex').addEventListener('click',()=>busy($('connect-yandex'),async()=>{await api('yandex/connect',{});await poll();},'yandex-feedback'));
for(const id of ['connect-vk','refresh-vk'])$(id).addEventListener('click',()=>busy($(id),async()=>{await api('vk/connect',{});vkQRStamp='';await poll();},'vk-feedback'));

function seekPreview(){if(pendingPreviewSeek!==null&&Number.isFinite(preview.duration)){const position=pendingPreviewSeek;pendingPreviewSeek=null;if(Math.abs(preview.currentTime-position)>.4)preview.currentTime=Math.max(0,Math.min(position,preview.duration));}}
async function previewTick(){
 if(previewBusy)return;previewBusy=true;
 const event=previewEvent||(previewOwner&&state?.current&&!preview.paused&&!preview.seeking&&preview.readyState>=3?{type:'progress',id:state.current.id,position:preview.currentTime,epoch:state.epoch}:null);
 try{const next=await api('preview-player',{player:previewPlayer,event});if(previewEvent===event)previewEvent=null;if(previewOwner!==next.owner)previewSync=true;previewOwner=next.owner;render(next);}
 catch{previewOwner=false;preview.muted=true;preview.pause();$('player-status').textContent='Нет связи с плеером. Переподключаемся…';}
 finally{previewBusy=false;}
}
preview.addEventListener('loadedmetadata',seekPreview);
preview.addEventListener('timeupdate',()=>{if(previewOwner&&state?.current?.id===preview.dataset.id){$('elapsed').textContent=time(preview.currentTime);if(!scrubbing)$('seek').value=Math.round(preview.currentTime);}});
for(const type of ['ended','error'])preview.addEventListener(type,()=>{if(previewOwner&&state?.current?.id===preview.dataset.id&&preview.getAttribute('src')){previewEvent={type,id:state.current.id,epoch:state.epoch};previewTick();}});
$('enable-preview').addEventListener('click',()=>preview.play().then(()=>{$('enable-preview').hidden=true;}).catch(()=>message('feedback','Браузер не смог включить звук. Повторите запуск',true)));
addEventListener('pagehide',()=>{preview.pause();fetch('api/preview-player',{method:'POST',keepalive:true,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Ankuzo-Music':'1'},body:JSON.stringify({player:previewPlayer,type:'release'})}).catch(()=>{});});

$('compact-cover').addEventListener('error',()=>{$('compact-cover').hidden=true;$('compact-mark').hidden=false;});
poll();previewTick();setInterval(poll,1500);setInterval(previewTick,750);

async function moveTrack(id,direction){const items=state.items.filter(x=>['ready','resolving'].includes(x.status));const index=items.findIndex(x=>x.id===id);if(index<0)return;const beforeId=direction<0?items[index-1]?.id:items[index+2]?.id||null;if(direction<0&&!beforeId)return;await command('move',{id,beforeId});message('feedback','Порядок очереди сохранён');}
$('queue').addEventListener('dragstart',event=>{const row=event.target.closest('li');if(!row||event.target.closest('button')){event.preventDefault();return;}dragging=row.dataset.id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragging);row.classList.add('dragging');});
$('queue').addEventListener('dragover',event=>{if(!dragging)return;event.preventDefault();event.dataTransfer.dropEffect='move';const row=event.target.closest('li');for(const li of $('queue').children)li.classList.toggle('drop-before',li===row&&li.dataset.id!==dragging);});
$('queue').addEventListener('drop',event=>{if(!dragging)return;event.preventDefault();const id=dragging;const beforeId=event.target.closest('li')?.dataset.id||null;dragging=null;lastRows='';if(beforeId!==id)command('move',{id,beforeId}).then(()=>message('feedback','Порядок очереди сохранён')).catch(e=>{message('feedback',e.message,true);poll();});});
$('queue').addEventListener('dragend',()=>{dragging=null;lastRows='';for(const li of $('queue').children)li.classList.remove('dragging','drop-before');if(state)render(state);});
function renderBackground(){const bg=state.background||{};$('bg-state').textContent=bg.enabled?(bg.title||'Подготовка…'):bg.total?'Выключена':'Не включена';$('bg-quick').hidden=!bg.total;$('bg-current-source').textContent=bg.title||'Яндекс Музыка';$('bg-toggle').textContent=bg.enabled?'Выключить фон':'Включить фон';$('bg-previous').disabled=!bg.enabled;$('bg-next').disabled=!bg.enabled;$('bg-wave').disabled=!state.yandex?.connected;$('bg-library-play').disabled=!state.yandex?.connected;$('bg-search').disabled=!state.yandex?.connected;if(bg.error)message('bg-feedback',bg.error,true);if($('background-panel').open&&state.yandex?.connected&&!libraryLoaded)loadLibrary();}
async function background(action,extra={}){render(await api('background',{action,...extra}));message('bg-feedback',action==='source'?'Готовим музыку. Заказы дождутся конца фонового трека.':'Готово');}
async function loadLibrary(){libraryLoaded=true;try{const data=await api('yandex/library');const likes=document.createElement('option');likes.value='likes';likes.textContent='Любимые треки'+(Number.isFinite(data.likesCount)?' · '+data.likesCount:'');const groups=[];for(const [group,label] of [['own','Мои плейлисты'],['saved','Сохранённые плейлисты']]){const el=document.createElement('optgroup');el.label=label;for(const item of data.playlists.filter(x=>x.group===group)){const option=document.createElement('option');option.value=item.key;option.textContent=item.title+' · '+item.count;el.append(option);}if(el.children.length)groups.push(el);}$('bg-library').replaceChildren(likes,...groups);}catch(e){libraryLoaded=false;message('bg-feedback',e.message,true);}}
$('background-panel').addEventListener('toggle',()=>{if($('background-panel').open&&state?.yandex.connected&&!libraryLoaded)loadLibrary();});
$('bg-wave').addEventListener('click',()=>busy($('bg-wave'),()=>background('source',{kind:'wave'}),'bg-feedback'));
$('bg-library-play').addEventListener('click',()=>busy($('bg-library-play'),()=>background('source',$('bg-library').value==='likes'?{kind:'likes'}:{kind:'playlist',key:$('bg-library').value}),'bg-feedback'));
for(const [id,action] of [['bg-previous','previous'],['bg-next','next']])$(id).addEventListener('click',()=>busy($(id),()=>background(action),'bg-feedback'));
$('bg-toggle').addEventListener('click',()=>busy($('bg-toggle'),()=>background(state.background.enabled?'stop':'resume'),'bg-feedback'));
$('bg-search-form').addEventListener('submit',event=>{event.preventDefault();busy($('bg-search'),async()=>{const data=await api('yandex/search?q='+encodeURIComponent($('bg-query').value.trim()));$('bg-results').replaceChildren(...data.tracks.map(track=>{const li=document.createElement('li'),copy=document.createElement('div'),title=document.createElement('strong'),duration=document.createElement('span'),play=document.createElement('button');title.textContent=track.title;duration.textContent=time(track.duration);duration.className='meta';copy.append(title,duration);play.type='button';play.textContent='Слушать';play.setAttribute('aria-label','Фоном: '+track.title);play.addEventListener('click',()=>busy(play,()=>background('source',{kind:'track',key:track.trackId+':'+track.albumId}),'bg-feedback'));li.append(copy,play);return li;}));message('bg-search-feedback',data.tracks.length?'Выберите трек для фона. Один трек будет повторяться.':'Треки не найдены');},'bg-search-feedback');});
