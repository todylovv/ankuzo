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
export function deckCardPose(g,w,h,i){
  const mobile=w<=760,delay=Math.abs(i-1)*.025,enter=range(g,0,1),leave=range(g,1.04+delay,1.72);
  const spread=range(g,.08+delay,.9),fan=spread*(i===1?1:1-leave*.3);
  const xs=mobile?[-.29,-.145,0,.145,.29]:[-.24,-.09,.06,.20,.33];
  const ys=mobile?[.025,-.025,-.045,-.025,.025]:[.055,-.025,-.005,.025,.06];
  const angles=mobile?[-19,-10,0,10,19]:[-17,-6,2,10,18];
  const departure=i===1?0:leave*(i<1?-1:1);
  const width=mobile?Math.min(w*(h<=680?.31:.34),190):h<=720?w*.14:clamp(w*.15,165,260);
  return {x:.5+xs[i]*fan+(mobile?0:.035)+departure*(.7+Math.abs(i-1)*.08),
    y:(mobile?(h<=680?.63:.61):.57)+ys[i]*fan+(1-enter)*.45+Math.abs(departure)*.08,
    width,rotate:angles[i]*fan+departure*18,scale:1,flip:0};
}
export function travellerPose(g,w,h){
  const mobile=w<=760,travel=range(g,1.32,1.98);
  const statWidth=mobile?Math.min(240,w*.62):Math.min(380,Math.max(300,w*.26));
  const startWidth=mobile?Math.min(w*.31,150):Math.min(380,Math.max(190,w*.23));
  const source=deckCardPose(g,w,h,1);
  const initial={x:mix(source.x,mobile?(h<=680?.70:.56):.74,travel),y:mix(source.y,mobile?(h<=680?.77:.75):.53,travel),width:mix(source.width,statWidth,travel),rotate:mix(source.rotate,mobile?2:4,travel),scale:mix(1,mobile?(h<=680?.69:.78):1,travel),flip:0};
  if(g<=2)return initial;
  const toPlay=range(g,2.12,2.96),toAbout=range(g,3.14,3.94);
  const play={x:mobile?.18:.595,y:mobile?(h<=700?.44:.40):.245,width:mobile?Math.min(w*.19,90):clamp(w*.105,125,170),rotate:-14,scale:1,flip:180};
  const about={x:mobile?.84:.27,y:mobile?.16:.50,width:startWidth,rotate:-8,scale:mobile?.56:1.03,flip:180};
  const pose={};for(const key of Object.keys(initial))pose[key]=mix(mix(initial[key],play[key],toPlay),about[key],toAbout);
  // Clear the outgoing PlayStation heading before the card expands beside About.
  if(!mobile)pose.y+=.10*Math.sin(Math.PI*toAbout)**2;
  pose.scale=Math.min(pose.scale,h*.78/(pose.width*1.5));
  return pose;
}
