export const CHAPTER_SPAN = 3.6;
export const CHAPTERS = ['home','games','stats','playstation','about'];
export function phaseAt(scroll,height){return height>0?Math.max(0,Math.min(CHAPTERS.length-1,scroll/(height*CHAPTER_SPAN))):0;}
export function advancePhase(current,target,dt,rate=.7){
  const distance=target-current;if(Math.abs(distance)<.0002)return target;
  const elapsed=Math.max(0,Math.min(50,dt));
  const step=Math.min(Math.abs(distance)*(1-Math.exp(-elapsed/180)),elapsed*rate/1000);
  return current+Math.sign(distance)*step;
}
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)};
const range=(n,a,b)=>ease((n-a)/(b-a));
export function travellerPose(g,w,h){
  const mobile=w<=760,travel=range(g,1.32,1.98);
  const statWidth=mobile?Math.min(240,w*.62):Math.min(380,Math.max(300,w*.26));
  const startWidth=mobile?Math.min(w*.31,150):Math.min(380,Math.max(190,w*.23));
  const initial={x:mobile?mix(.355,h<=680?.70:.56,travel):mix(.445,.74,travel),y:mobile?mix(.585,h<=680?.77:.75,travel):mix(.545,.53,travel),width:mix(startWidth,statWidth,travel),rotate:mix(mobile?-10:-6,mobile?2:4,travel),scale:mix(mobile?1.17:.70,mobile?(h<=680?.69:.78):1,travel),flip:0};
  if(g<=2)return initial;
  const toPlay=range(g,2.12,2.96),toAbout=range(g,3.14,3.94);
  const play={x:mobile?.18:.595,y:mobile?(h<=700?.44:.40):.245,width:mobile?Math.min(w*.19,90):clamp(w*.105,125,170),rotate:-14,scale:1,flip:180};
  const about={x:mobile?.84:.27,y:mobile?.16:.50,width:startWidth,rotate:-8,scale:mobile?.56:1.03,flip:180};
  const pose={};for(const key of Object.keys(initial))pose[key]=mix(mix(initial[key],play[key],toPlay),about[key],toAbout);
  pose.scale=Math.min(pose.scale,h*.78/(pose.width*1.5));
  return pose;
}
