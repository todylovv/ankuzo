export class Background {
 constructor({queue,yandex,media,feedbackEnabled=true,onFailure=async()=>{}}={}){this.queue=queue;this.yandex=yandex;this.media=media;this.feedbackEnabled=feedbackEnabled;this.onFailure=onFailure;this.selection=0;this.running=null;this.timer=null;this.retryAt=0;this.failures=0;this.failureGeneration=0;this.startedSessions=new Set();this.feedbackQueue=[];this.feedbackRunning=null;}
 async configure(spec){
  if(!spec||!['wave','likes','playlist','track'].includes(spec.kind))throw Error('Выберите источник Яндекс Музыки');
  if(['playlist','track'].includes(spec.kind)&&(!/^\d+:\d+$/.test(spec.key||'')||spec.key.length>100))throw Error('Выберите трек или плейлист из списка');
  const sequence=++this.selection;const result=spec.kind==='wave'?await this.yandex.wave():await this.yandex.catalog(spec);
  if(sequence!==this.selection)throw Error('Источник уже изменён в другой вкладке');
  this.queue.backgroundSet({kind:spec.kind,title:result.title,tracks:result.tracks,sourceKey:spec.key||null,radioSession:result.radioSession||null});this.retryAt=0;this.failures=0;this.queue.play();
 }
 control(action){if(action==='stop'){this.selection++;this.queue.backgroundStop();}else if(action==='resume'){if(!this.queue.state.background.tracks.length)throw Error('Сначала выберите источник фона');this.queue.state.background.enabled=true;this.queue.state.background.error=null;this.queue.play();this.queue.save();}else if(action==='next')this.queue.backgroundStep(1);else if(action==='previous')this.queue.backgroundStep(-1);else throw Error('Неизвестная команда фоновой музыки');}
 tick(){if(this.running)return this.running;this.running=this.work().finally(()=>{this.running=null;});return this.running;}
 flushFeedback(){if(this.feedbackRunning)return;this.feedbackRunning=(async()=>{while(this.feedbackQueue.length){const event=this.feedbackQueue.shift();try{
   if(event.type==='started'&&!this.startedSessions.has(event.radioSessionId)){await this.yandex.feedback?.({...event,type:'radio-started'});this.startedSessions.add(event.radioSessionId);}
   await this.yandex.feedback?.(event);
  }catch{ /* Listening feedback must not interrupt audio or paid orders. */ }
   if(this.startedSessions.size>50)this.startedSessions.delete(this.startedSessions.values().next().value);
  }})().finally(()=>{this.feedbackRunning=null;if(this.feedbackQueue.length)this.flushFeedback();});}
 async work(){
  const q=this.queue;const events=q.drainBackgroundEvents();if(this.feedbackEnabled&&events.length){this.feedbackQueue.push(...events);this.feedbackQueue=this.feedbackQueue.slice(-40);this.flushFeedback();}
  let b=q.state.background;if(!b.enabled||Date.now()<this.retryAt)return;
  try{
   if(this.failureGeneration!==b.generation){this.failureGeneration=b.generation;this.failures=0;}
   const current=b.items.find(x=>x.backgroundIndex===b.index);
   if(current?.status==='error'){
    b.error=current.error;this.failures++;if(this.failures>=3){b.enabled=false;q.save();return;}q.backgroundStep(1);
   }else if(current?.status==='ready'||current?.status==='playing')this.failures=0;
   const generation=b.generation;
   if(b.kind==='wave'&&b.tracks.length-b.index<=2){
    let more;try{more=await this.yandex.wave(b.radioSession?.id||null,b.tracks.slice(-50).map(x=>x.trackId));}catch{more=await this.yandex.wave(null,b.tracks.slice(-50).map(x=>x.trackId));}
    if(q.state.background.generation!==generation)return;
    if(b.tracks.length>=500&&b.index>=b.tracks.length){q.backgroundSet({kind:'wave',title:more.title,tracks:more.tracks,radioSession:more.radioSession});b=q.state.background;}else q.backgroundAppend(more.tracks,more.radioSession);
   }
   if(!b.tracks.length)return;
   if(b.index<b.tracks.length)q.backgroundEnsure(b.index);
   const next=b.kind==='wave'?b.index+1:(b.index+1)%b.tracks.length;if(next<b.tracks.length&&next!==b.index)q.backgroundEnsure(next);
   await this.media.work(q,this.onFailure);q.maybeStart();
  }catch(error){if(b!==q.state.background)return;b.error=String(error.message||'Фоновая музыка временно недоступна').slice(0,240);q.save();this.retryAt=Date.now()+10000;}
 }
 start(){this.tick();this.timer=setInterval(()=>this.tick(),1000);this.timer.unref();}
 close(){clearInterval(this.timer);}
}
