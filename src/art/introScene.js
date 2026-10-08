import { assemble } from './introPortraitFacts.js';

const SIZE=640, STEP=5;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};

/** The mask and hair share one sampled portrait, so their roots cannot separate. */
export function mountIntroScene(overlay,{staticGraphics=false}={}) {
  const portrait=overlay.querySelector('.intro-portrait');
  const canvas=document.createElement('canvas');canvas.className='intro-art';canvas.setAttribute('aria-hidden','true');
  canvas.width=canvas.height=SIZE;portrait.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){canvas.remove();return {ready:Promise.resolve(),exit(){},dispose(){}};}
  const mask=document.createElement('canvas'),hair=document.createElement('canvas');
  for(const layer of [mask,hair])layer.width=layer.height=SIZE;
  const maskCtx=mask.getContext('2d'),hairCtx=hair.getContext('2d');
  if(!maskCtx||!hairCtx){canvas.remove();return {ready:Promise.resolve(),exit(){},dispose(){}};}
  const life=new AbortController();
  let disposed=false,raf=0,last=0,clock=0,painted=0,cells=[],loaded=false,exiting=false;
  let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});
  fetch('/art/intro-portrait.json',{signal:life.signal}).then(response=>{
    if(!response.ok)throw new Error('Portrait unavailable');return response.json();
  }).then(rows=>{
    if(disposed)return;
    if(!Array.isArray(rows)||rows.length>6272)throw new Error('Invalid portrait');
    for(const paint of [maskCtx,hairCtx]){paint.font='10px "DejaVu Sans Mono","Cascadia Mono","Segoe UI Symbol",monospace';paint.textBaseline='top';}
    for(const [col,row,code,isHair,light] of rows){
      if(![col,row,code,isHair,light].every(Number.isFinite)||col<0||col>=112||row<0||row>=56||code<1||code>255)throw new Error('Invalid portrait cell');
      const brightness=light/255,seed=random(row*112+col),x=40+col*STEP,y=40+row*STEP*2;
      const ink=isHair?`rgb(${Math.round(210+brightness*45)},${Math.round(29+brightness*46)},${Math.round(68+brightness*64)})`:`rgb(${Math.round(176+brightness*74)},${Math.round(171+brightness*72)},${Math.round(176+brightness*68)})`;
      const paint=isHair?hairCtx:maskCtx;paint.fillStyle=ink;
      const glyph=String.fromCharCode(0x2800+code);paint.fillText(glyph,x,y,STEP);
      cells.push({row,x,y,seed,ink,glyph,hair:isHair});
    }
    loaded=true;overlay.classList.add('intro-art-ready');draw(staticGraphics?3:clock);
    overlay.dataset.portraitCells=String(cells.length);resolveReady();
  }).catch(()=>{if(!disposed)canvas.remove();resolveReady();});
  function filaments(t){
    const reveal=smooth(t/1.3);if(!reveal)return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let index=0;index<2;index++){
      const sway=Math.sin(t*.4+index)*12;
      ctx.beginPath();
      if(index===0){ctx.moveTo(-10,410);ctx.bezierCurveTo(140,525+sway,180,115-sway,340,150);ctx.bezierCurveTo(535,190+sway,530,520,655,405);}
      else{ctx.moveTo(35,90);ctx.bezierCurveTo(85+sway,210,95,560,330,562);ctx.bezierCurveTo(520,560,540-sway,290,625,230);}
      ctx.strokeStyle='#cf2857';ctx.globalAlpha=reveal*.27;ctx.lineWidth=2.8;
      ctx.shadowColor='#df1b4c';ctx.shadowBlur=13;ctx.stroke();
      ctx.shadowBlur=0;ctx.strokeStyle='#e54c79';ctx.globalAlpha=reveal*.48;ctx.lineWidth=.65;ctx.stroke();
      ctx.setLineDash([17,1350]);ctx.lineDashOffset=-t*96-index*290;
      ctx.strokeStyle='#ffc0d5';ctx.globalAlpha=reveal*.8;ctx.lineWidth=1.1;ctx.shadowBlur=7;ctx.stroke();ctx.setLineDash([]);
    }
    ctx.shadowBlur=0;
    for(let i=0;i<24;i++){
      const seed=random(i+91),angle=seed*Math.PI*2+t*(.03+seed*.03),radius=242+random(i+126)*67;
      const x=320+Math.cos(angle)*radius,y=320+Math.sin(angle)*radius;
      ctx.globalAlpha=(.12+seed*.25)*reveal;ctx.fillStyle=i%3?'#b42b51':'#f5c5d3';
      ctx.font='8px monospace';ctx.fillText(i%3?'·':i%2?'⠂':'⠄',x,y);
    }
    ctx.restore();
  }
  function draw(t){
    ctx.clearRect(0,0,SIZE,SIZE);
    if(!staticGraphics){
      const aura=ctx.createRadialGradient(320,300,130,320,300,312);
      aura.addColorStop(0,'#8d103100');aura.addColorStop(.6,'#8d103114');aura.addColorStop(1,'#8d103100');
      ctx.fillStyle=aura;ctx.fillRect(0,0,SIZE,SIZE);filaments(t);
    }
    if(!loaded)return;
    if(t<2.7&&!staticGraphics){
      ctx.font='10px "DejaVu Sans Mono","Cascadia Mono","Segoe UI Symbol",monospace';ctx.textBaseline='top';
      for(const cell of cells){
        const amount=assemble(t,cell.row,cell.seed);if(amount<=.01)continue;
        const drift=1-amount,angle=cell.seed*Math.PI*2;
        const x=cell.x+Math.cos(angle)*drift*(60+cell.seed*130),y=cell.y+Math.sin(angle)*drift*74;
        ctx.globalAlpha=amount*amount;ctx.fillStyle=cell.ink;ctx.fillText(cell.glyph,x,y,STEP);
      }
      ctx.globalAlpha=1;
    }else{
      // Two-pixel strips preserve the sampled hair volume; movement fades at the hairline.
      for(let y=0;y<SIZE;y+=2){
        const top=clamp((365-y)/280);
        const dx=staticGraphics?0:Math.sin(t*.8+y*.012)*2.4*top;
        ctx.drawImage(hair,0,y,SIZE,2,dx,y,SIZE,2);
      }
      if(!staticGraphics){ctx.save();ctx.globalAlpha=.22;ctx.shadowColor='#f52860';ctx.shadowBlur=10;ctx.drawImage(hair,0,0);ctx.restore();}
      ctx.drawImage(mask,0,0);
      if(!staticGraphics){
        // A sparse sheen moves across existing glyphs; it never fills the eye openings.
        const sheen=clamp(1-Math.abs((t%7)-3.3)/1.6)*.13;
        ctx.globalCompositeOperation='screen';ctx.globalAlpha=sheen;ctx.drawImage(mask,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      }
    }
    overlay.dataset.introTime=t.toFixed(2);
  }
  function frame(now){
    raf=0;if(disposed||document.hidden||exiting)return;
    clock+=last?(now-last)/1000:0;last=now;
    if(now-painted>=32){painted=now;draw(clock);}
    raf=requestAnimationFrame(frame);
  }
  function resume(){cancelAnimationFrame(raf);last=0;if(!staticGraphics&&!document.hidden&&!disposed&&!exiting)raf=requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',resume,{signal:life.signal});resume();
  return {ready,exit(){exiting=true;cancelAnimationFrame(raf);},dispose(){disposed=true;life.abort();cancelAnimationFrame(raf);cells=[];canvas.remove();resolveReady();}};
}
