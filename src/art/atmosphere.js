/* Cards, suspended threads and energy live behind the content on one bounded canvas. */
export function mountAtmosphere(root) {
  const canvas = root.querySelector('.velvet-field'), ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const life = new AbortController();
  const texture = new Image(); texture.src = '/art/card-back.png';
  let raf = 0, disposed = false, w = 0, h = 0, last = 0;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const cards = [
    { x:.035,y:.31,size:.048,angle:-.38,depth:.12,alpha:.22 },
    { x:.31,y:.16,size:.038,angle:.31,depth:.15,alpha:.22 },
    { x:.57,y:.16,size:.038,angle:-.28,depth:.18,alpha:.20 },
    { x:.42,y:.23,size:.089,angle:-.19,depth:.48,alpha:.58,tied:true },
    { x:.97,y:.40,size:.075,angle:.21,depth:.6,alpha:.52,tied:true },
    { x:.36,y:.78,size:.111,angle:-.39,depth:.55,alpha:.50 },
    { x:.075,y:1.05,size:.36,angle:-.48,depth:1,alpha:.25,blur:9 },
    { x:1.055,y:.01,size:.23,angle:.3,depth:.85,alpha:.18,blur:7 },
  ];
  const clamp = x => Math.max(0, Math.min(1,x));
  const smooth = (x,a,b) => { const t=clamp((x-a)/(b-a));return t*t*(3-2*t); };
  const disabled = () => disposed || document.hidden || root.classList.contains('motion-off') || root.classList.contains('webgl-ready');
  root.addEventListener('pointermove', event => {
    if(event.pointerType==='mouse'){targetX=(event.clientX/innerWidth-.5)*2;targetY=(event.clientY/innerHeight-.5)*2;}
  },{passive:true,signal:life.signal});
  root.addEventListener('pointerleave',()=>{targetX=0;targetY=0;},{signal:life.signal});
  function drawCard(card,i,seconds,g,mobile) {
    const drift=Math.sin(seconds*.18+i*1.7),yaw=Math.cos(seconds*.13+i)*.10;
    const width=w*card.size*(mobile?1.2:1),height=width*1.5;
    const x=w*card.x+drift*w*.008+pointerX*card.depth*11-g*w*.012*card.depth;
    const y=h*card.y+Math.cos(seconds*.15+i)*h*.007+pointerY*card.depth*7-g*h*.016*card.depth;
    const angle=card.angle+Math.sin(seconds*.16+i)*.045;
    const alpha=card.alpha*(1-smooth(g,.5,1.8)*.46);
    const warp=Math.cos(yaw);const c=Math.cos(angle),s=Math.sin(angle);
    if(card.tied){
      ctx.save();ctx.globalAlpha=alpha*.65;ctx.strokeStyle='#b52a50';ctx.lineWidth=.65;
      for(const sign of [-1,1]){
        const lx=sign*width*.49*warp,ly=-height*.23;
        const ex=x+lx*c-ly*s,ey=y+lx*s+ly*c;
        ctx.beginPath();ctx.moveTo(ex-drift*8,-20);ctx.bezierCurveTo(ex-drift*4,ey*.35,ex,ey*.7,ex,ey);ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(warp,1);ctx.globalAlpha=alpha;
    ctx.filter=card.blur?`blur(${mobile?card.blur*.65:card.blur}px)`:'none';
    ctx.drawImage(texture,108,123,808,1272,-width/2,-height/2,width,height);
    if(card.tied){
      ctx.strokeStyle='#c93661';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(-width*.49,-height*.23);ctx.quadraticCurveTo(0,-height*.20,width*.49,-height*.23);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-width*.49,-height*.215);ctx.lineTo(width*.49,-height*.215);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(time){
    raf=0;if(disabled())return;
    const mobile=innerWidth<=760;
    if(time-last<(mobile?48:32)){raf=requestAnimationFrame(draw);return;}last=time;
    const dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.5);
    if(w!==innerWidth||h!==innerHeight){w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const seconds=time/1000,g=Number(root.dataset.phase)||0;
    pointerX+=(targetX-pointerX)*.035;pointerY+=(targetY-pointerY)*.035;
    if(texture.complete&&texture.naturalWidth){
      cards.forEach((card,i)=>{if(!mobile||[1,3,4,6].includes(i))drawCard(card,i,seconds,g,mobile);});
    }
    raf=requestAnimationFrame(draw);
  }
  function resume(){cancelAnimationFrame(raf);raf=0;if(!disabled())raf=requestAnimationFrame(draw);}
  const observer=new MutationObserver(resume);observer.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',resume,{signal:life.signal});resume();
  return ()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();life.abort();texture.src='';};
}
