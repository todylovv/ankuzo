import { CHAPTER_SPAN, CHAPTERS, phaseAt, advancePhase, travellerPose, deckCardPose } from './motionFacts.js';

export function mountArtMotion(root, drawSilk) {
  'use strict';
  const body=root;
  const restoration=history.scrollRestoration;history.scrollRestoration='manual';
  const life=new AbortController();let disposed=false;
  const listen=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal:life.signal});
  const scenes=[...root.querySelectorAll('.scene')];
  const cards=[...root.querySelectorAll('.game-card')];
  const traveller=root.querySelector('.traveller');
  const travellerGame=root.querySelector('.traveller-game');
  const playerCard=traveller.querySelector('.faceit-on-card');
  const flipper=root.querySelector('.flipper');
  const thread=root.querySelector('.thread');
  const paths=[...thread.querySelectorAll('path')];
  const ghost=root.querySelector('.ghost');
  const ambient=root.querySelector('.ambient');
  const progressBar=root.querySelector('.progress i');
  const nav=root.querySelector('#chapter-nav');
  const navLinks=[...nav.querySelectorAll('a')];
  const menu=root.querySelector('.menu-button');
  const next=root.querySelector('.next');
  const counter=root.querySelector('.chapter-count>span');
  const aboutCopy=root.querySelector('.about-copy');
  const heroCopy=root.querySelector('.hero-copy'),archiveCopy=root.querySelector('.archive-copy');
  const travellerFront=traveller.querySelector('.traveller-front'),travellerBack=traveller.querySelector('.traveller-back');
  const names=CHAPTERS, last=names.length-1;
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)};
  const interval=(v,a,b)=>ease((v-a)/(b-a));
  let reduced=root.dataset.quality==='off', active=-1, raf=0, shown=0, previous=0, navigationUntil=0, viewportPosition=scrollY/(innerHeight*CHAPTER_SPAN);
  // A deterministic development-only timeline makes individual transition frames inspectable.
  let reviewPhase=null, reviewPanel=null;
  if(import.meta.env.DEV && new URLSearchParams(location.search).has('motion-review')){
    reviewPhase=Number(new URLSearchParams(location.search).get('motion-review'))||0;
    reviewPanel=document.createElement('div');reviewPanel.className='motion-review';
    reviewPanel.style.cssText='position:fixed;bottom:6px;left:44%;z-index:300;background:#100c12;padding:6px;font:12px Arial;color:white';
    reviewPanel.innerHTML='<label>Кадр <input aria-label="Фаза анимации" type="number" min="0" max="4" step="0.01" style="width:70px"></label>';
    reviewPanel.querySelector('input').value=String(reviewPhase);root.append(reviewPanel);
    listen(reviewPanel.querySelector('input'),'input',event=>{reviewPhase=clamp(Number(event.target.value),0,last);cancelAnimationFrame(raf);render();});
  }
  root.style.setProperty('--chapter-span', `${CHAPTER_SPAN*100}vh`);
  // Four paths have the same cubic topology. Their interpolation is pure in scroll position.
  const threadShapes=[
    [650,420, 580,480,650,650,510,670, 400,690,330,600,260,660, 160,750,140,820,30,810, -30,810,-50,790,-100,770],
    [-100,700, 120,900,150,400,320,430, 450,250,550,220,620,280, 750,300,780,400,920,430, 1030,430,1030,500,1100,480],
    [-100,395, 200,370,320,430,400,390, 490,360,460,250,390,310, 310,380,550,390,700,240, 850,220,1000,280,1100,290],
    [-100,700, 100,730,230,720,280,650, 430,580,320,480,250,550, 150,610,180,790,310,780, 560,780,860,850,1100,800]
  ];
  const mobileShapes=[
    [-100,760, 150,850,300,810,490,700, 640,620,580,450,650,420, 780,450,760,590,900,620, 1000,660,1000,690,1100,730],
    [-100,740, 120,880,200,650,320,610, 450,460,550,470,620,540, 750,570,780,610,920,640, 1030,650,1030,700,1100,720],
    [-100,490, 140,450,300,550,450,500, 620,440,500,340,430,410, 350,480,620,500,750,570, 850,590,1000,580,1100,560],
    [-100,250, 100,280,230,350,400,320, 580,300,500,170,400,200, 220,240,290,360,520,370, 700,390,860,450,1100,420]
  ];
  threadShapes.splice(3,0,[-100,200, 130,180,340,180,500,220, 550,240,560,280,620,260, 700,260,850,500,980,480, 1030,480,1050,510,1100,500]);
  mobileShapes.splice(3,0,[-100,400, 100,390,150,350,240,360, 300,370,350,400,400,420, 520,440,700,550,940,570, 1030,580,1050,600,1100,610]);
  function pathString(points){let d=`M ${points[0]} ${points[1]}`;for(let i=2;i<points.length;i+=6)d+=` C ${points.slice(i,i+6).join(' ')}`;return d}
  function visibility(g,i){return 1-interval(Math.abs(g-i),.08,.40)}
  function setActive(index){
    if(active===index)return;
    active=index;body.dataset.chapter=names[index];
    navLinks.forEach((a,i)=>i===index?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    counter.textContent=String(index+1).padStart(2,'0');
    next.href=`#${reduced?'view-':''}${names[Math.min(index+1,last)]}`;
    next.innerHTML=index===last?'К началу <span>↑</span>':'Листай дальше <span>↓</span>';
    if(index===last)next.href=reduced?'#view-home':'#home';
  }
  function render(timestamp=performance.now()){
    const started=performance.now();
    raf=0;
    if(disposed)return;
    if(root.querySelector('dialog[open]')){previous=0;return;}
    if(reduced){
      const closest=scenes.reduce((best,el,i)=>Math.abs(el.getBoundingClientRect().top)<best.distance?{index:i,distance:Math.abs(el.getBoundingClientRect().top)}:best,{index:0,distance:Infinity});
      setActive(closest.index);return;
    }
    const w=innerWidth,h=innerHeight,mobile=w<=760;
    viewportPosition=scrollY/(h*CHAPTER_SPAN);
    const q=phaseAt(scrollY,h);
    const target=reviewPhase??q;
    const dt=previous?Math.min(40,timestamp-previous):16;previous=timestamp;
    shown=reviewPhase===null?advancePhase(shown,target,dt,timestamp<navigationUntil?2.2:.7):target;
    if(Math.abs(shown-target)<.0002)shown=target;
    const g=shown;
    const tail=mobile?Math.max(0,scrollY-last*h*CHAPTER_SPAN):0;
    aboutCopy.style.transform=`translateY(${-tail}px)`;
    setActive(clamp(Math.round(g),0,last));
    body.dataset.phase=g.toFixed(3);
    scenes.forEach((el,i)=>{
      let opacity=visibility(g,i);const offset=i===1?0:(i-g)*(mobile?34:65);
      if(i===0)opacity=1-interval(g,.12,.59);
      if(i===1)opacity=interval(g,.15,.73)*(1-interval(g,1.22,1.73));
      if(i===3)opacity=interval(g,2.24,2.86)*(1-interval(g,3.20,3.76));
      el.style.opacity=opacity.toFixed(4);
      el.style.transform=`translate3d(0,${offset}px,0)`;
      const inert=Math.round(g)!==i||opacity<.75;
      if(el.inert!==inert){el.inert=inert;el.setAttribute('aria-hidden',String(inert));}
    });
    heroCopy.style.opacity=visibility(g,0).toFixed(4);
    archiveCopy.style.opacity=visibility(g,1).toFixed(4);
    const travelIn=interval(g,1.04,1.20);
    cards.forEach((el,i)=>{
      const pose=deckCardPose(g,w,h,i);
      el.style.left=`${pose.x*100}%`;el.style.top=`${pose.y*100}%`;el.style.width=`${pose.width}px`;
      el.style.transform=`translate(-50%,-50%) rotate(${pose.rotate}deg) rotateY(${i===1?0:(i-2)*-4*interval(g,.08,.9)}deg)`;
      el.style.zIndex=String([2,6,5,4,3][i]);
      el.style.opacity=i===1&&travelIn===1?'0':'1';
    });
    traveller.style.opacity=travelIn.toFixed(4);
    const pose=travellerPose(g,w,h);
    traveller.style.width=`${pose.width}px`;
    traveller.style.left=`${pose.x*100}%`;traveller.style.top=`${pose.y*100}%`;
    traveller.style.transform=`translate(-50%,-50%) rotate(${pose.rotate}deg) scale(${pose.scale})`;
    flipper.style.transform=`rotateY(${pose.flip}deg)`;
    travellerFront.style.visibility=pose.flip<90?'visible':'hidden';
    travellerBack.style.visibility=pose.flip>90?'visible':'hidden';
    travellerGame.style.opacity=(1-interval(g,1.35,1.98)).toFixed(3);
    playerCard.style.opacity=interval(g,1.55,1.98).toFixed(3);
    const cardHidden=Math.abs(g-2)>.15;traveller.inert=cardHidden;traveller.setAttribute('aria-hidden',String(cardHidden));
    if(!drawSilk){
      const shapes=mobile?mobileShapes:threadShapes,a=Math.min(threadShapes.length-2,Math.floor(g)),t=g-a;
      const d=pathString(shapes[a].map((n,i)=>mix(n,shapes[a+1][i],t)));paths.forEach(p=>p.setAttribute('d',d));
    }
    ghost.style.transform=`translate3d(${-g*20}px,${g*15}px,0) rotate(${-g*2}deg)`;
    ghost.style.opacity=(1-interval(g,2,3)).toFixed(3);
    ambient.style.transform=`translateX(${mix(0,-15,g/last)}%)`;
    progressBar.style.transform=`scaleX(${q/last})`;
    drawSilk?.(g,w,h);
    body.dataset.frameMs=(performance.now()-started).toFixed(2);
    if(Math.abs(shown-target)>.0001)queue();
  }
  function queue(){if(!disposed&&!raf)raf=requestAnimationFrame(render)}
  function setMode(off,preserve=true){
    const current=Math.max(0,active);reduced=off;body.classList.toggle('motion-off',off);
    navLinks.forEach((a,i)=>a.href=`#${off?'view-':''}${names[i]}`);
    root.querySelector('.brand').href=off?'#view-home':'#home';
    root.querySelector('[data-jump]').href=off?'#view-games':'#games';
    scenes.forEach(el=>{el.inert=false;el.setAttribute('aria-hidden','false')});
    root.querySelector('.about-copy').style.transform='';
    if(off)cards.forEach((el,i)=>{
      const mobile=innerWidth<=760;
      el.style.left='50%';el.style.top=mobile?'61%':'57%';el.style.width='';el.style.opacity='1';
      el.style.transform=`translate(calc(-50% + ${(i-2)*(mobile?innerWidth*.145:innerWidth*.15)}px),-50%) rotate(${(i-2)*8}deg)`;
    });
    active=-1;
    if(preserve)root.querySelector(`#${off?'view-':''}${names[current]}`).scrollIntoView({behavior:'instant'});
    queue();
  }
  listen(root,'click',e=>{const link=e.target.closest('a[href^="#"]');if(link&&names.some(name=>link.hash===`#${name}`))navigationUntil=performance.now()+2500;});
  listen(root,'ankuzo:quality-change',e=>{const off=e.detail==='off';if(off!==reduced)setMode(off)});
  listen(menu,'click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
  listen(nav,'click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});
  listen(document,'keydown',e=>{if(e.key==='Escape'){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});

  listen(root.querySelector('dialog'),'close',queue);
  listen(window,'scroll',queue,{passive:true});listen(window,'resize',()=>{if(reduced)setMode(true,false);else {window.scrollTo({top:viewportPosition*innerHeight*CHAPTER_SPAN,behavior:'instant'});queue();}});
  listen(window,'pageshow',queue);document.fonts.ready.then(queue);
  listen(root.querySelector('.skip'),'click',()=>{if(!reduced)root.dispatchEvent(new Event('ankuzo:static-request'));root.querySelector('#view-games').focus()});
  setMode(reduced,false);
  // Keep links from the previous archive usable after the redesign.
  const psnDirect=/\/playstation\/?$/.test(location.pathname)||new URLSearchParams(location.search).has('playstation');
  const initialName=psnDirect?'playstation':location.hash.slice(1).replace(/^view-/, '').split('/')[0];
  if(names.includes(initialName)){
    root.querySelector(`#${reduced?'view-':''}${initialName}`).scrollIntoView({behavior:'instant'});
    if(location.hash.includes('/'))history.replaceState(null,'',`#${reduced?'view-':''}${initialName}`);
  }
  shown=phaseAt(scrollY,innerHeight);
  render();
  return ()=>{disposed=true;life.abort();cancelAnimationFrame(raf);reviewPanel?.remove();root.classList.remove('motion-off');history.scrollRestoration=restoration;};
}
