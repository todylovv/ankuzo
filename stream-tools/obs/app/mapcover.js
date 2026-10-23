(()=>{
 'use strict';
 const stage=document.getElementById('mapcover-stage'),cover=document.getElementById('mapcover'),messages=document.getElementById('chat-messages');
 const compact=new URLSearchParams(location.search).get('widget')==='1';stage.classList.toggle('widget-source',compact);
 if(compact)document.body.append(document.getElementById('mapcover-boot'));
 const base=new URL('.',location.href);base.username='';base.password='';let settings=window.AnkuzoTimer.normalizeSettings({},'mapcover'),revision=-1,chat=[],signature='',offset=0,demoUntil=0;
 const demo=[{id:'demo-one',name:'Чат',color:'#d7adc2',text:'Вот так сообщения появятся на обороте карты.',receivedAt:Date.now()},{id:'demo-two',name:'Зритель',color:'#e893ae',text:'Миникарта остаётся закрытой ✦',receivedAt:Date.now()}];
 function fit(){
  const width=compact?settings.width:1920,height=compact?settings.height:1080;
  stage.style.width=width+'px';stage.style.height=height+'px';stage.style.setProperty('--scene-scale',Math.min(innerWidth/width,innerHeight/height));
  if(parent!==window)parent.postMessage({type:'ankuzo-widget-size',scene:'mapcover',width:settings.width,height:settings.height},location.origin);
 }fit();addEventListener('resize',fit);
 function render(){
  const isDemo=Date.now()<demoUntil;
  const visible=settings.chatEnabled?(isDemo?demo:chat.filter(m=>Date.now()+offset-m.receivedAt<settings.chatDuration*1000)).slice(-settings.chatLines):[];
  cover.classList.toggle('has-chat',visible.length>0);messages.classList.toggle('single-message',visible.length===1);
  const next=visible.map(m=>m.id).join('|');if(next===signature)return;signature=next;messages.replaceChildren();
  for(const m of visible){const row=document.createElement('article'),name=document.createElement('b'),text=document.createElement('p');row.className='chat-message';name.textContent=m.name;text.textContent=m.text;
   let color=/^#[a-f\d]{6}$/i.test(m.color||'')?m.color:'#f0a4c0';const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));if(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<105)color='#f0a4c0';name.style.color=color;row.append(name,text);messages.append(row);
  }
 }
 function apply(next){
  if(next.revision===revision)return;revision=next.revision;settings=window.AnkuzoTimer.normalizeSettings(next.settings,'mapcover');
  for(const [prop,key]of [['left','x'],['top','y'],['width','width'],['height','height']])cover.style[prop]=settings[key]+'px';
  if(compact){cover.style.left='0px';cover.style.top='0px';}fit();
  cover.dataset.shape=settings.shape;
  cover.style.setProperty('--cover-radius',Math.min(24,Math.max(10,Math.round(Math.min(settings.width,settings.height)*.06)))+'px');
  cover.hidden=!settings.coverVisible;cover.style.setProperty('--cover-type',Math.max(11,Math.min(23,settings.width/19,settings.height/17))+'px');cover.style.setProperty('--name-type',Math.max(12,Math.min(32,settings.width/16))+'px');
  cover.classList.toggle('no-motion',!settings.motion);cover.classList.toggle('light-mode',settings.quality==='light');
  document.getElementById('mapcover-boot').hidden=true;render();
 }
 async function statePoll(){try{const r=await fetch(new URL('api/state?scene=mapcover',base),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(r.ok)apply(await r.json());else if(r.status===401)return;}catch{}setTimeout(statePoll,500);}
 async function chatPoll(){try{if(settings.chatEnabled){const r=await fetch(new URL('api/chat',base),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(r.ok){const next=await r.json();offset=next.serverNow-Date.now();chat=Array.isArray(next.messages)?next.messages.slice(-20):[];render();}}}catch{}setTimeout(chatPoll,800);}
 addEventListener('message',e=>{if(parent!==window&&e.source===parent&&e.origin===location.origin&&e.data?.type==='ankuzo-chat-preview'){demoUntil=Date.now()+10000;render();}});
 document.fonts.ready.then(()=>{revision=-1;});setInterval(render,200);statePoll();chatPoll();
})();
