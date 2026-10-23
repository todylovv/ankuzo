const ENABLED='ankuzo.music.monitor',VOLUME='ankuzo.music.personalVolume',LEASE='ankuzo.music.monitorLease';
const read=(key,fallback)=>{try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value);}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
export class PersonalAudio {
 constructor(onChange){this.onChange=()=>queueMicrotask(onChange);this.id=crypto.randomUUID();this.enabled=read(ENABLED,true)===true;const value=read(VOLUME,.7);this.volume=Number.isFinite(value)&&value>=0&&value<=1?value:.7;this.owner=false;this.generation=0;this.abort=null;this.release=null;this.timer=null;
  document.getElementById('monitor-local').addEventListener('change',event=>{this.enabled=event.target.checked;save(ENABLED,this.enabled);this.reserve();this.onChange();});
  document.getElementById('local-volume').addEventListener('input',event=>{this.volume=Number(event.target.value)/100;save(VOLUME,this.volume);this.onChange();});
  addEventListener('storage',event=>{if(event.key===ENABLED){this.enabled=read(ENABLED,true)===true;this.reserve();this.onChange();}if(event.key===VOLUME){this.volume=Math.max(0,Math.min(1,Number(read(VOLUME,.7))||0));this.onChange();}});
  addEventListener('pagehide',()=>this.stop());addEventListener('pageshow',()=>this.reserve());this.reserve();
 }
 stop(){this.generation++;this.abort?.abort();this.abort=null;this.release?.();this.release=null;clearInterval(this.timer);this.owner=false;}
 reserve(){this.stop();if(!this.enabled)return;const generation=this.generation;
  if(navigator.locks){const controller=new AbortController();this.abort=controller;navigator.locks.request('ankuzo-music-monitor',{signal:controller.signal},async()=>{if(generation!==this.generation)return;this.owner=true;this.onChange();await new Promise(resolve=>{this.release=resolve;});if(generation===this.generation){this.owner=false;this.onChange();}}).catch(()=>{});}
  else{const claim=()=>{const lease=read(LEASE,null);if(!lease||lease.until<Date.now()||lease.player===this.id){save(LEASE,{player:this.id,until:Date.now()+2500});this.owner=read(LEASE,null)?.player===this.id;}else this.owner=false;this.onChange();};claim();this.timer=setInterval(claim,1000);}
 }
 audible(controller,kind){return this.enabled&&(controller||(kind==='obs'&&this.owner));}
 apply(video,controller,kind){const audible=this.audible(controller,kind);video.volume=this.volume;video.muted=!audible;return audible;}
 render(){const field=document.getElementById('local-volume');if(document.activeElement!==field)field.value=Math.round(this.volume*100);document.getElementById('monitor-local').checked=this.enabled;document.getElementById('local-volume-value').textContent=Math.round(this.volume*100)+'%';}
}
