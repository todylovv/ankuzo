/* Cards, suspended threads and energy live behind the content on one bounded canvas. */
export function mountAtmosphere(root) {
  const canvas = root.querySelector('.velvet-field'), ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const life = new AbortController();
  const character = root.querySelector('.character');
  const texture = new Image(); texture.src = '/art/card-back.png';
  let raf = 0, disposed = false, w = 0, h = 0, last = 0, energy = null;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const cards = [
    { x:.34, y:.17, size:.044, angle:-.25, depth:.12, alpha:.22 },
    { x:.66, y:.14, size:.047, angle:.31, depth:.18, alpha:.19 },
    { x:.94, y:.59, size:.045, angle:-.16, depth:.15, alpha:.19 },
    { x:.51, y:.19, size:.077, angle:-.15, depth:.48, alpha:.58, tied:true },
    { x:.96, y:.33, size:.073, angle:.18, depth:.6, alpha:.52, tied:true },
    { x:-.035, y:.93, size:.25, angle:-.43, depth:1, alpha:.21, blur:9 },
    { x:1.06, y:.04, size:.20, angle:.25, depth:.85, alpha:.15, blur:7 },
  ];
  const plumes = [
    [.13,.72, -.13,.57, .24,.43, .12,.26],
    [.20,.53, -.04,.38, .39,.27, .27,.10],
    [.36,.29, .17,.14, .55,.09, .47,-.05],
    [.73,.23, .99,.11, .70,.02, .85,-.04],
    [.84,.45, 1.14,.35, .82,.27, 1.00,.14],
    [.91,.70, 1.16,.56, .87,.46, 1.10,.35],
  ];
  const clamp = x => Math.max(0, Math.min(1,x));
  const smooth = (x,a,b) => { const t=clamp((x-a)/(b-a));return t*t*(3-2*t); };
  const disabled = () => disposed || document.hidden || root.classList.contains('motion-off');
  function prepareEnergy() {
    if (!character.complete || !character.naturalWidth) return;
    // Bake the expensive glow once; animation only moves the resulting small texture.
    const small = document.createElement('canvas'); small.width=640;small.height=920;
    const ink=small.getContext('2d');if(!ink)return;
    ink.drawImage(character,24,24,592,872);
    ink.globalCompositeOperation='source-in';ink.fillStyle='#bd1643';ink.fillRect(0,0,640,920);
    energy=document.createElement('canvas');energy.width=720;energy.height=1000;
    const glow=energy.getContext('2d');if(!glow){energy=null;return;}
    glow.shadowColor='#d51f4b';glow.shadowBlur=30;glow.drawImage(small,40,40);
  }
  character.addEventListener('load',prepareEnergy,{signal:life.signal});prepareEnergy();
  root.addEventListener('pointermove', event => {
    if(event.pointerType==='mouse'){targetX=(event.clientX/innerWidth-.5)*2;targetY=(event.clientY/innerHeight-.5)*2;}
  },{passive:true,signal:life.signal});
  root.addEventListener('pointerleave',()=>{targetX=0;targetY=0;},{signal:life.signal});
  function drawEnergy(seconds,g,mobile) {
    const strength=(1-smooth(g,.08,.67))*(.64+Math.sin(seconds*1.1)*.09);
    if(strength<.003)return;
    const rect=character.getBoundingClientRect();if(!rect.width)return;
    ctx.save();ctx.globalCompositeOperation='screen';
    if(energy){
      ctx.globalAlpha=strength*.9;
      const padX=rect.width*64/592,padY=rect.height*64/872;
      ctx.drawImage(energy,rect.x-padX,rect.y-padY-3,rect.width+padX*2,rect.height+padY*2);
    }
    for(const [i,points] of plumes.entries()){
      if(mobile && i%2===1)continue;
      const drift=Math.sin(seconds*.7+i*1.7)*.012;
      const xy=(index)=>[rect.x+(points[index]+drift*(index?1:0))*rect.width,rect.y+points[index+1]*rect.height];
      const a=xy(0),b=xy(2),c=xy(4),tip=xy(6);
      const width=rect.width*(.025+Math.sin(seconds*.8+i)*.005);
      const flame=ctx.createLinearGradient(a[0],a[1],tip[0],tip[1]);
      flame.addColorStop(0,'#d5214c00');flame.addColorStop(.35,'#b31b48');flame.addColorStop(.8,'#e32750');flame.addColorStop(1,'#d5214c00');
      ctx.beginPath();ctx.moveTo(...a);ctx.bezierCurveTo(...b,...c,...tip);
      ctx.bezierCurveTo(c[0]+width,c[1],b[0]-width,b[1],...a);ctx.closePath();
      ctx.globalAlpha=strength*.25;ctx.fillStyle=flame;ctx.fill();
      ctx.beginPath();ctx.moveTo(...a);ctx.bezierCurveTo(...b,...c,...tip);
      ctx.globalAlpha=strength*.35;ctx.lineWidth=mobile?1:1.5;ctx.strokeStyle='#dd244e';ctx.stroke();
      ctx.setLineDash([22+i*3,100+i*13]);ctx.lineDashOffset=-seconds*(23+i*2)-i*31;
      ctx.globalAlpha=strength*.65;ctx.lineWidth=.85;ctx.shadowColor='#cf1740';ctx.shadowBlur=8;ctx.stroke();
      ctx.setLineDash([]);ctx.shadowBlur=0;
    }
    ctx.restore();
  }
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
    ctx.drawImage(texture,-width/2,-height/2,width,height);
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
    drawEnergy(seconds,g,mobile);
    if(texture.complete&&texture.naturalWidth){
      cards.forEach((card,i)=>{if(!mobile||[0,4,5].includes(i))drawCard(card,i,seconds,g,mobile);});
    }
    // Sparse rising embers tie the energy to the card scene, fading near text.
    ctx.save();ctx.fillStyle='#d82a52';
    const count=mobile?9:20;
    for(let i=0;i<count;i++){
      const x=w*(.58+((i*.137)%1)*.42)+Math.sin(seconds*.2+i)*6;
      const y=h*(1-((seconds*.018+i*.173)%1));
      ctx.globalAlpha=(.15+Math.sin(seconds*.8+i)*.08)*(1-smooth(g,.4,1.6)*.7);
      ctx.fillRect(x,y,i%3===0?1.5:1,i%3===0?1.5:1);
    }
    ctx.restore();raf=requestAnimationFrame(draw);
  }
  function resume(){cancelAnimationFrame(raf);raf=0;if(!disabled())raf=requestAnimationFrame(draw);}
  const observer=new MutationObserver(resume);observer.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',resume,{signal:life.signal});resume();
  return ()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();life.abort();energy=null;texture.src='';};
}
