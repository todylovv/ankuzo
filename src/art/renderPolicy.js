export function frameDue(now,last,fps){return last===0 || now-last>=1000/fps-.8;}
export function silkPixelRatio(width,dpr=1,quality='motion'){return Math.min(dpr||1,width<=760?(quality==='full'?1.5:1.25):2);}
export function renderBudget(width,height,dpr=1,scale=1){
  width=Math.max(1,width);height=Math.max(1,height);
  const ratio=Math.min(Math.max(.5,dpr),1.5,Math.sqrt(2200000/(width*height)))*scale;
  const auraRatio=Math.min(1,Math.sqrt(450000/(width*height)))*scale;
  return {ratio,width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),auraWidth:Math.max(1,Math.round(width*auraRatio)),auraHeight:Math.max(1,Math.round(height*auraRatio))};
}
/** Resolution changes only after sustained missed frames, without removing full-tier effects. */
export function nextRenderScale(current,samples){
  const valid=samples.filter(n=>Number.isFinite(n)&&n>0&&n<1000);
  if(valid.length<12 || valid.reduce((sum,n)=>sum+n,0)<1500 || valid.filter(n=>n>24).length/valid.length<.65)return current;
  return Math.max(.55,Math.round(current*.85*100)/100);
}

/** Broad smoke stays smooth without paying for Retina-sized procedural shading. */
export function smokeBudget(width,height,scale=1,light=false){
 width=Math.max(1,width);height=Math.max(1,height);
 const ratio=Math.min(1,Math.sqrt((light?120000:220000)/(width*height)))*Math.max(.3,Math.min(1,scale));
 return {width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio))};
}

/** Decorative cards become less prominent by transparency, retaining their printed detail. */
export function decorativeCardAppearance(phase,weight=1){
 const t=Math.max(0,Math.min(1,(phase-.45)/1.15)),fade=t*t*(3-2*t);
 return {brightness:.95,opacity:Math.max(0,Math.min(1,weight))*(1-.5*fade)};
}
