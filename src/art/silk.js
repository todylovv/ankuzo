/* Two continuous tails and a band fixed in each card's local 3D space. */
export function mountSilk(root) {
  'use strict';
  const canvas=root.querySelector('.silk'),ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return {draw:undefined,dispose(){}};
  const leadCanvas=document.createElement('canvas');leadCanvas.className='silk silk-lead';leadCanvas.setAttribute('aria-hidden','true');canvas.after(leadCanvas);
  const leadCtx=leadCanvas.getContext('2d',{alpha:true});
  if(!leadCtx){leadCanvas.remove();return {draw:undefined,dispose(){}};}
  root.classList.add('has-silk');
  root.querySelectorAll('.eyelet').forEach(el=>el.remove());
  const cards=[...root.querySelectorAll('.game-card')];
  const flipper=root.querySelector('.flipper');
  function bindCard(el,back=false){
    const band=`<svg class="card-band${back?' band-back':''}" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path class="band-shadow" d="M -2 90 C 28 94 72 86 102 90"/><path class="band-body" d="M -2 90 C 28 94 72 86 102 90"/><path class="band-shine" d="M -2 89.5 C 28 93.5 72 85.5 102 89.5"/>${back?'':'<path class="band-knot" d="M 91 90 c 4 -4 6 -2 3 1 c -3 3 -5 0 -2 -2 M 94 91 l 3 4"/>'}</svg>`;
    el.insertAdjacentHTML('beforeend',band);
  }
  function attach(el){
    for(const side of ['left','right']){const pin=document.createElement('i');pin.className=`tie-anchor tie-${side}`;pin.setAttribute('aria-hidden','true');el.append(pin)}
    return {left:el.querySelector('.tie-left'),right:el.querySelector('.tie-right')};
  }
  const anchors=cards.map(el=>{bindCard(el);return attach(el)});
  bindCard(flipper);bindCard(flipper,true);
  const moving=attach(flipper),character=root.querySelector('.character');
  let cw=0,ch=0;
  const mix=(a,b,t)=>a+(b-a)*t;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
  const range=(n,a,b)=>ease((n-a)/(b-a));
  const center=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  function curve(nodes,n=45){
    const out=[];
    for(let j=0;j<nodes.length-1;j+=3){
      const a=nodes[j],b=nodes[j+1],c=nodes[j+2],d=nodes[j+3];
      for(let i=0;i<=n;i++){const t=i/n,u=1-t;out.push([0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]))}
    }
    return out;
  }
  function subdivideCubic(p){
    const at=t=>{const u=1-t;return [0,1].map(k=>u*u*u*p[0][k]+3*u*u*t*p[1][k]+3*u*t*t*p[2][k]+t*t*t*p[3][k])};
    const tangent=t=>{const u=1-t;return [0,1].map(k=>3*u*u*(p[1][k]-p[0][k])+6*u*t*(p[2][k]-p[1][k])+3*t*t*(p[3][k]-p[2][k]))};
    const nodes=[p[0]];
    for(let i=0;i<3;i++){const a=at(i/3),b=at((i+1)/3),da=tangent(i/3),db=tangent((i+1)/3);nodes.push(a.map((v,k)=>v+da[k]/9),b.map((v,k)=>v-db[k]/9),b)}
    return nodes;
  }
  function rope(points,alpha,mobile,fadeHead=0,paint=ctx){
    if(alpha<.003)return;
    const ctx=paint;
    ctx.globalAlpha=alpha*.16*(1-fadeHead*.65);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
    ctx.strokeStyle='#ff286b';ctx.lineWidth=mobile?3:4;ctx.shadowColor='#ff286b';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],t=i/(points.length-1);
      ctx.globalAlpha=alpha*(1-fadeHead*(1-range(t,0,.22)));
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineWidth=mobile?1.6:2.15;ctx.strokeStyle='#db245d';ctx.stroke();
      ctx.beginPath();ctx.moveTo(a[0],a[1]-.3);ctx.lineTo(b[0],b[1]-.3);ctx.lineWidth=mobile?.45:.6;ctx.strokeStyle='#f3a7c3';ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  const draw=(g,w,h)=>{
    const dpr=Math.min(devicePixelRatio||1,1.5),mobile=w<=760;
    if(cw!==w||ch!==h){cw=w;ch=h;for(const layer of [canvas,leadCanvas]){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);layer.style.width=w+'px';layer.style.height=h+'px'}}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    leadCtx.setTransform(dpr,0,0,dpr,0,0);leadCtx.clearRect(0,0,w,h);
    if(g<1.35){
      const ends=anchors.map(a=>({left:center(a.left),right:center(a.right)}));
      const image=character.getBoundingClientRect(),hand=[image.left+image.width*.245,image.top+image.height*.282];
      const first=ends[0].left;
      const alpha=1-range(g,1.05,1.35);
      // One gesture: the loop held by his fingers uncoils into the deck.
      // Identical cubic topology keeps the loop continuous in both directions.
      const loop=mobile?
        [hand,[hand[0]-w*.08,hand[1]+h*.17],[w*.18,h*.54],[w*.20,h*.68],[w*.23,h*.84],[w*.78,h*.86],[w*.78,h*.69],[w*.78,h*.54],[w*.46,h*.66],first]:
        [hand,[hand[0]-w*.06,hand[1]+h*.19],[w*.42,h*.40],[w*.38,h*.64],[w*.33,h*.88],[w*.68,h*.90],[w*.67,h*.69],[w*.66,h*.49],[w*.46,h*.65],first];
      const settled=subdivideCubic([[-w*.1,h*.72],[w*.02,h*.82],[first[0]-w*.08,first[1]+h*.12],first]);
      const uncoil=range(g,.12,.96);
      const release=range(g,.59,.96);
      rope(curve(loop.map((p,i)=>p.map((v,k)=>mix(v,settled[i][k],i<2?release:uncoil))),36),alpha,mobile,range(g,.15,.59),mobile?leadCtx:ctx);
      const links=range(g,.25,.90)*alpha;
      for(let i=0;i<ends.length-1;i++){
        const a=ends[i].right,b=ends[i+1].left;
        const reach=Math.min(w*.025,Math.abs(b[0]-a[0])*.38);
        rope(curve([a,[a[0]+reach,a[1]+h*.008],[b[0]-reach,b[1]+h*.008],b],24),links,mobile);
      }
      const a=ends.at(-1).right;
      rope(curve([a,[a[0]+w*.12,a[1]+h*.03],[w*1.03,h*.56],[w*1.1,h*.57]]),links,mobile);
    }
    if(g>1.04){
      // The visible edges exchange sides at 90°. Route each tail to its
      // screen-side edge so it cannot cross behind the card and emerge detached.
      const edges=[center(moving.left),center(moving.right)].sort((a,b)=>a[0]-b[0]);
      const [a,b]=edges,reveal=range(g,1.04,1.35),loosen=range(g,2.06,2.95);
      const y=mix(mobile?.51:.395,mobile?.31:.73,loosen)*h;
      const side=mobile?w*.12:w*.20;
      const first=[[-w*.10,y],[a[0]*.24,y+h*.06],[a[0]*.62,a[1]+h*.04],a];
      rope(curve(first),reveal,mobile);
      const endY=mix(mobile?.64:.58,mobile?.37:.81,loosen)*h;
      const last=[b,[b[0]+side*.55,b[1]+h*.045],[w*.87,endY+h*.04],[w*1.1,endY]];
      rope(curve(last),reveal,mobile);
    }
  };
  return { draw, dispose() { leadCanvas.remove(); root.querySelectorAll('.card-band,.tie-anchor').forEach(el=>el.remove()); root.classList.remove('has-silk'); } };
}
