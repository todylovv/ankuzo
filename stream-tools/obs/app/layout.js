(() => {
 'use strict';
 const composition=document.getElementById('composition'),canvas=document.getElementById('layout-canvas');
 function fit(){canvas.style.setProperty('--layout-scale',composition.clientWidth/1920);}
 fit();new ResizeObserver(fit).observe(composition);
 document.getElementById('layout-theme').addEventListener('change',e=>composition.classList.toggle('light',e.target.value==='light'));
 document.getElementById('show-hud').addEventListener('change',e=>{const guides=document.getElementById('hud-guides');guides.hidden=!e.target.checked;guides.setAttribute('aria-hidden',String(!e.target.checked));});
 document.getElementById('show-mapcover').addEventListener('change',e=>{document.getElementById('layout-mapcover').hidden=!e.target.checked;});
 const names={'bottom-left':'Слева внизу','bottom-center':'По центру внизу','bottom-right':'Справа внизу','top-left':'Слева вверху','top-right':'Справа вверху'};
 const base=new URL('.',location.href);base.username='';base.password='';
 async function poll(){
  try{
   const r=await fetch(new URL('api/state?scene=overlay',base),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error('Unavailable');
   const {settings:s,appearance:a}=await r.json();document.getElementById('placement-status').textContent=s.overlayVisible?`Пример: ${names[s.position]} · отступы ${s.marginX} / ${s.marginY} px${s.appearanceMode==='periodic'?a?.visible?' · В кадре':' · Ожидает следующего показа':''}`:'Оверлей скрыт в пульте';
  }catch{document.getElementById('placement-status').textContent='Нет связи с пультом — переподключаемся…';}
  setTimeout(poll,1500);
 }
 poll();
})();
