export function frameDue(now,last,fps){return last===0 || now-last>=1000/fps-.8;}
export function renderBudget(width,height,dpr=1,scale=1){
  width=Math.max(1,width);height=Math.max(1,height);
  const ratio=Math.min(Math.max(.5,dpr),1.5,Math.sqrt(2200000/(width*height)))*scale;
  const auraRatio=Math.min(1,Math.sqrt(450000/(width*height)))*scale;
  return {ratio,width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),auraWidth:Math.max(1,Math.round(width*auraRatio)),auraHeight:Math.max(1,Math.round(height*auraRatio))};
}
/** Resolution changes only after sustained missed frames, without removing full-tier effects. */
export function nextRenderScale(current,samples){
  const valid=samples.filter(n=>Number.isFinite(n)&&n>0&&n<1000);
  if(valid.length<90 || valid.filter(n=>n>24).length/valid.length<.65)return current;
  return Math.max(.55,Math.round(current*.85*100)/100);
}
