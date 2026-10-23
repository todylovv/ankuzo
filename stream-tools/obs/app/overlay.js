(() => {
 'use strict';
 const stage=document.getElementById('overlay-stage'),dock=document.getElementById('overlay-dock');
 const name=document.getElementById('overlay-name'),wordmark=document.getElementById('overlay-wordmark'),subtitle=document.getElementById('overlay-subtitle');
 const compact=new URLSearchParams(location.search).get('widget')==='1';stage.classList.toggle('widget-source',compact);let widgetScale=1;
 const base=new URL('.',location.href);base.username='';base.password='';let revision=-1,appearanceTimer;
 function fit(){
  const hidden=dock.hidden;if(hidden)dock.hidden=false;
  const width=456,height=dock.offsetHeight+16;
  if(hidden)dock.hidden=true;
  stage.style.width=(compact?width:1920)+'px';stage.style.height=(compact?height:1080)+'px';
  stage.style.setProperty('--scene-scale',Math.min(innerWidth/(compact?width:1920),innerHeight/(compact?height:1080)));
  if(parent!==window)parent.postMessage({type:'ankuzo-widget-size',scene:'overlay',width:Math.ceil(width*widgetScale),height:Math.ceil(height*widgetScale)},location.origin);
 }
 function fitName(){wordmark.style.fontSize='44px';const ratio=wordmark.clientWidth/Math.max(wordmark.clientWidth,wordmark.scrollWidth);if(ratio<1)wordmark.style.fontSize=(44*ratio*.98)+'px';}
 function apply(next){
  clearTimeout(appearanceTimer);
  const appearance=next.appearance||{visible:true,nextChangeAt:null};
  dock.classList.toggle('periodic-hidden',!appearance.visible);
  if(appearance.nextChangeAt!==null)appearanceTimer=setTimeout(()=>dock.classList.toggle('periodic-hidden',appearance.visible),Math.max(0,appearance.nextChangeAt-next.serverNow));
  if(next.revision===revision)return;revision=next.revision;
  const s=window.AnkuzoTimer.normalizeSettings(next.settings,'overlay');
  name.textContent=s.title;subtitle.textContent=s.subtitle;
  document.getElementById('overlay-dot').hidden=s.title.endsWith('.');
  document.getElementById('overlay-cards').hidden=!s.showCards;subtitle.hidden=!s.showSubtitle||!s.subtitle;
  dock.hidden=!s.overlayVisible;dock.classList.toggle('no-cards',!s.showCards);dock.classList.toggle('no-background',!s.showBackground);
  stage.dataset.position=s.position;stage.classList.toggle('no-motion',!s.motion);stage.classList.toggle('light-mode',s.quality==='light');
  stage.style.setProperty('--margin-x',s.marginX+'px');stage.style.setProperty('--margin-y',s.marginY+'px');
  widgetScale=({small:.75,standard:1,large:1.25})[s.size];stage.style.setProperty('--overlay-scale',widgetScale);stage.style.setProperty('--overlay-opacity',s.opacity/100);
  fitName();fit();
 }
 async function poll(){
  try{
   const url=new URL('api/state',base);url.searchParams.set('scene','overlay');
   const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(4000)});
   if(r.ok)apply(await r.json());else if(r.status===401){clearTimeout(appearanceTimer);dock.hidden=true;return;}
  }catch{/* Preserve the last overlay while reconnecting. */}
  setTimeout(poll,500);
 }
 fit();addEventListener('resize',fit);document.fonts.ready.then(()=>{fitName();fit();});new ResizeObserver(fit).observe(dock);
 apply({revision:-2,settings:{},appearance:{visible:false,nextChangeAt:null}});poll();
})();
