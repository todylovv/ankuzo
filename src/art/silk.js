import { travellerPose } from './motionFacts.js';
import { connectThread, fibreOffset } from './silkGeometry.js';
/* Tails and wraps share physical edge anchors on the currently visible card face. */
export function mountSilk(root) {
  'use strict';
  const canvas=root.querySelector('.silk'),ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return {draw:undefined,dispose(){}};
  const leadCanvas=document.createElement('canvas');leadCanvas.className='silk silk-lead';leadCanvas.setAttribute('aria-hidden','true');canvas.after(leadCanvas);
  const leadCtx=leadCanvas.getContext('2d',{alpha:true});
  if(!leadCtx){leadCanvas.remove();return {draw:undefined,dispose(){}};}
  const energyCanvas=document.createElement('canvas'),energyLead=document.createElement('canvas');
  energyCanvas.className='silk silk-energy';energyLead.className='silk silk-energy silk-energy-lead';
  for(const layer of [energyCanvas,energyLead]){layer.setAttribute('aria-hidden','true');leadCanvas.after(layer)}
  const energyCtx=energyCanvas.getContext('2d'),energyLeadCtx=energyLead.getContext('2d');
  const glowCache=document.createElement('canvas'),leadGlowCache=document.createElement('canvas');
  const glowCtx=glowCache.getContext('2d'),leadGlowCtx=leadGlowCache.getContext('2d');
  let glowDirty=true;
  const energyLife=new AbortController();
  let energyPaths=[],energyRaf=0,energyDisposed=false,energyLast=0,energyTime=0,energyPaint=0,ew=0,eh=0;
  const energyEnabled=()=>!energyDisposed&&root.dataset.quality==='full'&&!document.hidden&&!document.body.classList.contains('intro-pending');
  function recordEnergy(points,alpha,mobile,fadeHead,lead){
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    energyPaths.push({points,lengths,length:lengths.at(-1),alpha,mobile,fadeHead,lead});
  }
  function paintEnergy(now){
    const measureStart=performance.now();
    energyRaf=0;if(!energyEnabled()||!energyCtx||!energyLeadCtx)return;
    if(now-energyPaint<32){energyRaf=requestAnimationFrame(paintEnergy);return;}energyPaint=now;
    energyTime+=energyLast?Math.min((now-energyLast)/1000,.08):0;energyLast=now;
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,w<=760?1:1.25);
    if(ew!==w||eh!==h){ew=w;eh=h;for(const layer of [energyCanvas,energyLead,glowCache,leadGlowCache]){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);layer.style.width=w+'px';layer.style.height=h+'px'}glowDirty=true;}
    for(const paint of [energyCtx,energyLeadCtx]){paint.setTransform(dpr,0,0,dpr,0,0);paint.clearRect(0,0,w,h);paint.lineCap='round';paint.lineJoin='round'}
    // The broad glow is static between scroll updates. Rasterize it once, then reuse it.
    if(glowDirty && glowCtx && leadGlowCtx){
      for(const paint of [glowCtx,leadGlowCtx]){paint.setTransform(dpr,0,0,dpr,0,0);paint.clearRect(0,0,w,h);paint.lineCap='round';paint.lineJoin='round';}
      for(const path of energyPaths){
        const {points,alpha,mobile,fadeHead,lead}=path,paint=lead?leadGlowCtx:glowCtx;
        paint.beginPath();points.forEach((point,i)=>i?paint.lineTo(...point):paint.moveTo(...point));
        paint.lineWidth=mobile?4:6;paint.strokeStyle='#c51a43';paint.globalAlpha=alpha*.16*(1-fadeHead*.65);
        paint.shadowColor='#f5224b';paint.shadowBlur=mobile?10:17;paint.stroke();paint.shadowBlur=0;
      }
      glowDirty=false;
    }
    energyCtx.drawImage(glowCache,0,0,w,h);energyLeadCtx.drawImage(leadGlowCache,0,0,w,h);
    energyPaths.forEach((path,index)=>{
      const {points,lengths,length,alpha,mobile,fadeHead,lead}=path;if(length<1)return;
      const paint=lead?energyLeadCtx:energyCtx;
      paint.save();paint.globalCompositeOperation='screen';
      const head=(energyTime*74+index*113)%length;
      // Blur the pulse once per route, not once for every tiny line segment.
      paint.beginPath();
      for(let i=1;i<points.length;i++){
        const gap=Math.abs(((lengths[i]-head+length*1.5)%length)-length*.5);
        if(gap>Math.sqrt((mobile?2200:4000)*2.5))continue;
        paint.moveTo(...points[i-1]);paint.lineTo(...points[i]);
      }
      paint.lineWidth=mobile?1.1:1.4;paint.strokeStyle='#ff2857';paint.globalAlpha=alpha*.22;
      paint.shadowColor='#ff2857';paint.shadowBlur=mobile?7:11;paint.stroke();paint.shadowBlur=0;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],distance=lengths[i];
        const gap=Math.abs(((distance-head+length*1.5)%length)-length*.5);
        const pulse=Math.exp(-gap*gap/(mobile?2200:4000));if(pulse<.025)continue;
        const fade=1-fadeHead*(1-range(i/(points.length-1),0,.22));
        paint.beginPath();paint.moveTo(...a);paint.lineTo(...b);
        paint.lineWidth=mobile?1.1:1.4;paint.strokeStyle='#ffa0b8';paint.globalAlpha=alpha*pulse*fade*.64;
        paint.stroke();
      }
      paint.shadowBlur=0;
      // Fine energy fibres drift beside the core and remain attached through every transition.
      for(const side of [-1,1]){
        paint.beginPath();
        points.forEach((point,i)=>{
          const previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
          const dx=next[0]-previous[0],dy=next[1]-previous[1],size=Math.hypot(dx,dy)||1;
          const wave=fibreOffset(lengths[i],length,energyTime,side);
          const x=point[0]-dy/size*wave,y=point[1]+dx/size*wave;
          if(i)paint.lineTo(x,y);else paint.moveTo(x,y);
        });
        paint.strokeStyle='#e72a56';paint.lineWidth=.6;paint.globalAlpha=alpha*.14*(1-fadeHead*.65);paint.stroke();
      }
      paint.restore();
    });
    root.dataset.threadCpuMs=(performance.now()-measureStart).toFixed(2);root.dataset.threadEnergyTime=energyTime.toFixed(2);energyRaf=requestAnimationFrame(paintEnergy);
  }
  function resumeEnergy(){cancelAnimationFrame(energyRaf);energyLast=0;if(energyEnabled())energyRaf=requestAnimationFrame(paintEnergy);}
  root.addEventListener('ankuzo:quality-change',resumeEnergy,{signal:energyLife.signal});
  document.addEventListener('visibilitychange',resumeEnergy,{signal:energyLife.signal});
  document.addEventListener('ankuzo:intro-complete',resumeEnergy,{signal:energyLife.signal});
  resumeEnergy();
  root.classList.add('has-silk');
  root.querySelectorAll('.eyelet').forEach(el=>el.remove());
  const cards=[...root.querySelectorAll('.game-card')];
  const flipper=root.querySelector('.flipper');
  function bindCard(el,back=false){
    const band=`<svg class="card-band" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path class="band-shadow" d="M 0 90 C 33 91 67 89 100 90"/><path class="band-body" d="M 0 90 C 33 91 67 89 100 90"/><path class="band-shine" d="M 0 90 C 33 91 67 89 100 90"/>${back?'':'<path class="band-knot" d="M 91 90 c 4 -4 6 -2 3 1 c -3 3 -5 0 -2 -2 M 94 91 l 3 4"/>'}</svg>`;
    el.insertAdjacentHTML('beforeend',band);
  }
  function attach(el){
    for(const side of ['left','right','left-inner','right-inner']){const pin=document.createElement('i');pin.className=`tie-anchor tie-${side}`;pin.setAttribute('aria-hidden','true');el.append(pin)}
    return {left:el.querySelector('.tie-left'),right:el.querySelector('.tie-right'),leftInner:el.querySelector('.tie-left-inner'),rightInner:el.querySelector('.tie-right-inner')};
  }
  const anchors=cards.map(el=>{bindCard(el);return attach(el)});
  const front=flipper.querySelector('.traveller-front'),back=flipper.querySelector('.traveller-back');
  bindCard(front);bindCard(back,true);
  const movingFront=attach(front),movingBack=attach(back),character=root.querySelector('.character');
  let cw=0,ch=0;
  const mix=(a,b,t)=>a+(b-a)*t;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
  const range=(n,a,b)=>ease((n-a)/(b-a));
  const center=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  const edges=pins=>['left','right'].map(side=>{
    const point=center(pins[side]),inner=center(pins[side+'Inner']);
    return {point,out:point.map((v,k)=>v-inner[k])};
  }).sort((a,b)=>a.point[0]-b.point[0]);
  function curve(nodes,n=45){
    const out=[];
    for(let j=0;j<nodes.length-1;j+=3){
      const a=nodes[j],b=nodes[j+1],c=nodes[j+2],d=nodes[j+3];
      for(let i=0;i<=n;i++){const t=i/n,u=1-t;out.push([0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]))}
    }
    return out;
  }
  function subdivideCubic(p,parts=3){
    const at=t=>{const u=1-t;return [0,1].map(k=>u*u*u*p[0][k]+3*u*u*t*p[1][k]+3*u*t*t*p[2][k]+t*t*t*p[3][k])};
    const tangent=t=>{const u=1-t;return [0,1].map(k=>3*u*u*(p[1][k]-p[0][k])+6*u*t*(p[2][k]-p[1][k])+3*t*t*(p[3][k]-p[2][k]))};
    const nodes=[p[0]];
    for(let i=0;i<parts;i++){const a=at(i/parts),b=at((i+1)/parts),da=tangent(i/parts),db=tangent((i+1)/parts);nodes.push(a.map((v,k)=>v+da[k]/(parts*3)),b.map((v,k)=>v-db[k]/(parts*3)),b)}
    return nodes;
  }
  function rope(points,alpha,mobile,fadeHead=0,paint=ctx){
    if(alpha<.003)return;
    recordEnergy(points,alpha,mobile,fadeHead,paint===leadCtx);
    const ctx=paint;ctx.save();
    ctx.globalAlpha=alpha*.22*(1-fadeHead*.65);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
    ctx.strokeStyle='#ff1738';ctx.lineWidth=mobile?3:4;ctx.shadowColor='#ff1738';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],t=i/(points.length-1);
      ctx.globalAlpha=alpha*(1-fadeHead*(1-range(t,0,.22)));
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineWidth=mobile?1.6:2.15;ctx.strokeStyle='#dc2547';ctx.stroke();
      ctx.beginPath();ctx.moveTo(a[0],a[1]-.3);ctx.lineTo(b[0],b[1]-.3);ctx.lineWidth=mobile?.45:.6;ctx.strokeStyle='#f3a7c3';ctx.stroke();
    }
    ctx.restore();
  }
  const draw=(g,w,h)=>{
    energyPaths=[];glowDirty=true;
    const dpr=Math.min(devicePixelRatio||1,2),mobile=w<=760;
    if(cw!==w||ch!==h){cw=w;ch=h;for(const layer of [canvas,leadCanvas]){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);layer.style.width=w+'px';layer.style.height=h+'px'}glowDirty=true;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    leadCtx.setTransform(dpr,0,0,dpr,0,0);leadCtx.clearRect(0,0,w,h);
    const deckEdges=g<1.70?anchors.map(edges):[];
    const transfer=range(g,1.04,1.20),depart=range(g,1.18,1.70);
    const face=travellerPose(g,w,h).flip<=90?movingFront:movingBack;
    const movingEdges=edges(face);
    const selected=transfer===1?movingEdges:deckEdges[1].map((edge,i)=>({
      point:edge.point.map((v,k)=>mix(v,movingEdges[i].point[k],transfer)),
      out:edge.out.map((v,k)=>mix(v,movingEdges[i].out[k],transfer)),
    }));
    deckEdges[1]=selected;
    const link=(a,b)=>connectThread(a.point,b.point,a.out,b.out);
    const fadeDeck=1-range(g,1.25,1.70);
    if(g<1.70){
      const image=character.getBoundingClientRect(),hand=[image.left+image.width*.245,image.top+image.height*.282];
      const first=deckEdges[0][0];
      const loop=subdivideCubic([hand,[hand[0]-w*(mobile?.42:.40),hand[1]+h*(mobile?.32:.04)],[first.point[0]-w*(mobile?.24:.30),first.point[1]+h*.16],first.point]);
      const settled=subdivideCubic([[-w*.1,h*.72],[w*.02,h*.82],[first.point[0]-w*.08,first.point[1]+h*.12],first.point]);
      const uncoil=range(g,.12,.96),release=range(g,.59,.96);
      const lead=loop.map((p,i)=>p.map((v,k)=>mix(v,settled[i][k],i<2?release:uncoil)));
      // The final handle follows the actual band tangent in the card's rotated plane.
      const direction=first.out,length=Math.hypot(...direction)||1,reach=Math.min(w*.1,100);
      lead[8]=first.point.map((v,k)=>v+direction[k]/length*reach);
      rope(curve(lead,36),fadeDeck,mobile,range(g,.38,.59),mobile?leadCtx:ctx);
      const links=range(g,.25,.90);
      for(let i=0;i<deckEdges.length-1;i++){
        if(i===0||i===1)continue;
        rope(curve(link(deckEdges[i][1],deckEdges[i+1][0]),24),links*fadeDeck,mobile);
      }
      const last=deckEdges.at(-1)[1];
      rope(curve(connectThread(last.point,[w*1.1,h*.57],last.out,[-1,0])),links*fadeDeck,mobile);
    }
    // Adjacent cards move away to their respective sides. Each connecting segment
    // becomes a free tail; there is never a second rope crossfading over the first.
    const reveal=range(g,.25,.90),[left,right]=selected;
    const loosen=range(g,2.12,3.94),ps=range(g,2.12,2.96)*(1-range(g,3.14,3.94));
    const leftY=mix(mix(mobile?.51:.635,mobile?.14:.73,loosen),mobile?.40:.13,ps)*h;
    const rightY=mix(mix(mobile?.64:.58,mobile?.37:.94,loosen),mobile?.49:.42,ps)*h;
    const shelf=mobile?0:(1-loosen)*(1-ps)*range(g,1.35,1.98);
    const middle=[w*.40,h*.71];
    const baselineLeft=subdivideCubic(connectThread([-w*.1,leftY],left.point,[w*.01,0],left.out),2);
    const shelfLeft=[[-w*.1,h*.71],[w*.06,h*.71],[w*.28,h*.71],...connectThread(middle,left.point,[w*.01,0],left.out)];
    const freeLeft=baselineLeft.map((point,i)=>point.map((v,k)=>mix(v,shelfLeft[i][k],shelf)));
    const freeRight=connectThread(right.point,[w*1.1,rightY],right.out,[-w*.01,0]);
    const fromLeft=depart===1?freeLeft:subdivideCubic(link(deckEdges[0][1],left),2),fromRight=depart===1?freeRight:link(right,deckEdges[2][0]);
    const morph=(from,to)=>from.map((point,i)=>point.map((v,k)=>mix(v,to[i][k],depart)));
    rope(curve(morph(fromLeft,freeLeft)),reveal,mobile);
    rope(curve(morph(fromRight,freeRight)),reveal,mobile);
  };
  return { draw, dispose() { energyDisposed=true;cancelAnimationFrame(energyRaf);energyLife.abort();energyCanvas.remove();energyLead.remove();glowCache.width=1;leadGlowCache.width=1;energyPaths=[];leadCanvas.remove(); root.querySelectorAll('.card-band,.tie-anchor').forEach(el=>el.remove()); root.classList.remove('has-silk'); } };
}
