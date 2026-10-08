/* A quiet field of suspended fibres behind the stage, never over its text. */
export function mountAtmosphere(root) {
  const canvas=root.querySelector('.velvet-field'),ctx=canvas.getContext('2d');
  if(!ctx)return ()=>{};
  let raf=0,disposed=false,w=0,h=0,last=0;
  const strands=Array.from({length:9},(_,i)=>({x:(i*.173+.07)%1,phase:i*2.399,depth:.25+(i%3)*.25}));
  const disabled=()=>disposed||document.hidden||root.classList.contains('motion-off');
  function draw(time){
    raf=0;if(disabled())return;
    if(time-last<32){raf=requestAnimationFrame(draw);return;}last=time;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    if(w!==innerWidth||h!==innerHeight){w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const seconds=time/1000,g=Number(root.dataset.phase)||0;
    const glow=ctx.createRadialGradient(w*.64,h*.68,0,w*.64,h*.68,w*.65);
    glow.addColorStop(0,'#300c1b2b');glow.addColorStop(1,'#05050600');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(const [index,strand] of strands.entries()){
      const offset=Math.sin(seconds*.09+strand.phase)*w*.025;
      const x=strand.x*w+offset-g*w*.018*strand.depth;
      const bend=Math.sin(seconds*.13+strand.phase)*w*.055;
      const a=[x-w*.13,-h*.12],b=[x+w*.23+bend,h*.25],c=[x-w*.16+bend,h*.7],d=[x+w*.15,h*1.1];
      const at=t=>{const u=1-t;return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]);};
      ctx.beginPath();ctx.moveTo(...a);ctx.bezierCurveTo(...b,...c,...d);ctx.lineWidth=strand.depth>.5?.65:.4;
      ctx.strokeStyle=index%3===0?'#9c3c5c22':'#b8a9b71a';ctx.stroke();
      const t=(seconds*.018+index*.137)%1,point=at(t),before=at(Math.max(0,t-.035)),after=at(Math.min(1,t+.035));
      const glint=ctx.createLinearGradient(...before,...after);glint.addColorStop(0,'#ead4df00');glint.addColorStop(.5,'#b17d9260');glint.addColorStop(1,'#ead4df00');
      ctx.beginPath();ctx.moveTo(...before);ctx.lineTo(...point);ctx.lineTo(...after);ctx.strokeStyle=glint;ctx.lineWidth=1;ctx.stroke();
    }
    raf=requestAnimationFrame(draw);
  }
  function resume(){cancelAnimationFrame(raf);raf=0;if(!disabled())raf=requestAnimationFrame(draw);}
  const observer=new MutationObserver(resume);observer.observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',resume);resume();
  return ()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',resume);};
}
