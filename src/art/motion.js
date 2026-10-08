export function mountArtMotion(root, drawSilk) {
  'use strict';
  const body=root;
  const life=new AbortController();let disposed=false;
  const listen=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal:life.signal});
  const scenes=[...root.querySelectorAll('.scene')];
  const cards=[...root.querySelectorAll('.game-card')];
  const traveller=root.querySelector('.traveller');
  const travellerGame=root.querySelector('.traveller-game');
  const flipper=root.querySelector('.flipper');
  const thread=root.querySelector('.thread');
  const paths=[...thread.querySelectorAll('path')];
  const ghost=root.querySelector('.ghost');
  const ambient=root.querySelector('.ambient');
  const progressBar=root.querySelector('.progress i');
  const nav=root.querySelector('#chapter-nav');
  const navLinks=[...nav.querySelectorAll('a')];
  const menu=root.querySelector('.menu-button');
  const motionButton=root.querySelector('.motion-button');
  const next=root.querySelector('.next');
  const counter=root.querySelector('.chapter-count>span');
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const names=['home','games','stats','about'];
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)};
  const interval=(v,a,b)=>ease((v-a)/(b-a));
  let reduced=media.matches, manual=false, active=-1, raf=0, shown=0, previous=0;
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
  function pathString(points){let d=`M ${points[0]} ${points[1]}`;for(let i=2;i<points.length;i+=6)d+=` C ${points.slice(i,i+6).join(' ')}`;return d}
  function visibility(g,i){return 1-interval(Math.abs(g-i),.08,.40)}
  function setActive(index){
    if(active===index)return;
    active=index;
    navLinks.forEach((a,i)=>i===index?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    counter.textContent=String(index+1).padStart(2,'0');
    next.href=`#${reduced?'view-':''}${names[Math.min(index+1,3)]}`;
    next.innerHTML=index===3?'К началу <span>↑</span>':'Листай дальше <span>↓</span>';
    if(index===3)next.href=reduced?'#view-home':'#home';
  }
  function render(timestamp=performance.now()){
    const started=performance.now();
    raf=0;
    if(disposed)return;
    if(reduced){
      const closest=scenes.reduce((best,el,i)=>Math.abs(el.getBoundingClientRect().top)<best.distance?{index:i,distance:Math.abs(el.getBoundingClientRect().top)}:best,{index:0,distance:Infinity});
      setActive(closest.index);return;
    }
    const w=innerWidth,h=innerHeight,mobile=w<=760;
    const q=clamp(scrollY/(h*2.05),0,3);
    const base=Math.floor(q),f=q-base;
    const target=base+interval(f,.15,.86);
    const dt=previous?Math.min(40,timestamp-previous):16;previous=timestamp;
    shown=mix(shown,target,1-Math.exp(-dt/110));
    if(Math.abs(shown-target)<.0002)shown=target;
    const g=shown;
    setActive(clamp(Math.round(g),0,3));
    body.dataset.phase=g.toFixed(3);
    scenes.forEach((el,i)=>{
      let opacity=visibility(g,i);const offset=i===1?0:(i-g)*(mobile?34:65);
      if(i===0)opacity=1-interval(g,.12,.59);
      if(i===1)opacity=interval(g,.15,.73)*(1-interval(g,1.22,1.73));
      el.style.opacity=opacity.toFixed(4);
      el.style.transform=`translate3d(0,${offset}px,0)`;
      el.inert=Math.round(g)!==i||opacity<.75;
      el.setAttribute('aria-hidden',String(el.inert));
    });
    root.querySelector('.hero-copy').style.opacity=visibility(g,0).toFixed(4);
    root.querySelector('.archive-copy').style.opacity=visibility(g,1).toFixed(4);
    const enter=interval(g,0,1),leave=interval(g,1,2);
    const fanX=mobile?[-.29,-.145,0,.145,.29]:[-.24,-.09,.06,.20,.33];
    const fanY=mobile?[.025,-.025,-.045,-.025,.025]:[.055,-.025,-.005,.025,.06];
    const angles=mobile?[-19,-10,0,10,19]:[-17,-6,2,10,18];
    const fan=interval(g,.08,.9)*(1-leave);
    cards.forEach((el,i)=>{
      const cardLeave=i===1?0:leave,cardFan=i===1?interval(g,.08,.9):fan;
      const x=fanX[i]*w*cardFan+(mobile?0:w*.035)-cardLeave*w*(.75+i*.06);
      const y=fanY[i]*h*cardFan+(1-enter)*h*.45-cardLeave*h*.11;
      const z=(i===1?90:20-Math.abs(i-2)*20)*cardFan;
      el.style.transform=`translate3d(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px),${z.toFixed(2)}px) rotate(${(angles[i]*cardFan-35*cardLeave).toFixed(2)}deg) rotateY(${((i-2)*-5*cardFan).toFixed(2)}deg)`;
      el.style.zIndex=String([2,6,5,4,3][i]);
      el.style.opacity=i===1?(1-interval(g,1.05,1.30)).toFixed(3):'1';
    });
    const travelIn=interval(g,1.05,1.30),travel=interval(g,1.32,1.98),flip=interval(g,2.1,2.92);
    traveller.style.opacity=travelIn.toFixed(4);
    const statX=mobile?mix(.355,.78,travel):mix(.445,.70,travel);
    const statY=mobile?mix(.585,.73,travel):mix(.545,.53,travel);
    const tx=mix(statX,mobile?.50:.27,flip);
    const ty=mix(statY,mobile?(h<680?.19:.22):.50,flip);
    traveller.style.left=`${tx*100}%`;traveller.style.top=`${ty*100}%`;
    const zoom=Math.pow(Math.sin(Math.PI*flip),2)*interval(flip,.25,.65)*.72;
    const fit=Math.min(mobile?1.8:1.65,h*.78/traveller.offsetHeight);
    const scale=Math.min(fit,mix(mix(mobile?1.17:.70,mobile?.8:.85,travel),1.03,flip)+zoom);
    traveller.style.transform=`translate(-50%,-50%) rotate(${mix(mix(mobile?-10:-6,12,travel),-8,flip)}deg) scale(${scale})`;
    flipper.style.transform=`rotateY(${mix(0,180,flip)}deg)`;
    travellerGame.style.opacity=(1-interval(g,1.35,1.98)).toFixed(3);
    if(!drawSilk){
      const shapes=mobile?mobileShapes:threadShapes,a=Math.min(2,Math.floor(g)),t=g-a;
      const d=pathString(shapes[a].map((n,i)=>mix(n,shapes[a+1][i],t)));paths.forEach(p=>p.setAttribute('d',d));
    }
    ghost.style.transform=`translate3d(${-g*20}px,${g*15}px,0) rotate(${-g*2}deg)`;
    ghost.style.opacity=(1-interval(g,2,3)).toFixed(3);
    ambient.style.transform=`translateX(${mix(0,-15,g/3)}%)`;
    progressBar.style.transform=`scaleX(${q/3})`;
    drawSilk?.(g,w,h);
    body.dataset.frameMs=(performance.now()-started).toFixed(2);
    if(Math.abs(shown-target)>.0001)queue();
  }
  function queue(){if(!disposed&&!raf)raf=requestAnimationFrame(render)}
  function setMode(off,preserve=true){
    const current=Math.max(0,active);reduced=off;body.classList.toggle('motion-off',off);
    motionButton.setAttribute('aria-pressed',String(!off));
    motionButton.innerHTML=off?'Без движения<span> ○</span>':'Анимация: вкл<span> ◉</span>';
    navLinks.forEach((a,i)=>a.href=`#${off?'view-':''}${names[i]}`);
    root.querySelector('.brand').href=off?'#view-home':'#home';
    root.querySelector('[data-jump]').href=off?'#view-games':'#games';
    scenes.forEach(el=>{el.inert=false;el.setAttribute('aria-hidden','false')});
    if(off)cards.forEach((el,i)=>{
      const mobile=innerWidth<=760;
      el.style.transform=`translate(calc(-50% + ${(i-2)*(mobile?innerWidth*.145:innerWidth*.15)}px),-50%) rotate(${(i-2)*8}deg)`;
    });
    active=-1;
    if(preserve)root.querySelector(`#${off?'view-':''}${names[current]}`).scrollIntoView({behavior:'instant'});
    queue();
  }
  listen(motionButton,'click',()=>{manual=true;setMode(!reduced)});
  listen(media,'change',e=>{if(!manual)setMode(e.matches)});
  listen(menu,'click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
  listen(nav,'click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});
  listen(document,'keydown',e=>{if(e.key==='Escape'){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});

  listen(window,'scroll',queue,{passive:true});listen(window,'resize',()=>{if(reduced)setMode(true,false);else queue()});
  listen(window,'pageshow',queue);document.fonts.ready.then(queue);
  listen(root.querySelector('.skip'),'click',()=>{if(!reduced)setMode(true,false);root.querySelector('#view-games').focus()});
  setMode(reduced,false);
  // Keep links from the previous archive usable after the redesign.
  const initialName=location.hash.slice(1).replace(/^view-/, '').split('/')[0];
  if(names.includes(initialName)){
    root.querySelector(`#${reduced?'view-':''}${initialName}`).scrollIntoView({behavior:'instant'});
    if(location.hash.includes('/'))history.replaceState(null,'',`#${reduced?'view-':''}${initialName}`);
  }
  render();
  return ()=>{disposed=true;life.abort();cancelAnimationFrame(raf);root.classList.remove('motion-off');};
}
