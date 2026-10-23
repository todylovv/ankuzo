const active=new WeakMap();const running=new Set();let keyboard=false;
addEventListener('keydown',()=>{keyboard=true;},{capture:true});addEventListener('pointerdown',()=>{keyboard=false;},{capture:true});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',e=>{if(e.matches)for(const animation of running)animation.cancel();});
export function morphGroup(elements,update){
 const nodes=elements.filter(Boolean);const before=nodes.map(el=>el.getBoundingClientRect());for(const el of nodes)active.get(el)?.cancel();update();
 if(reduced.matches||keyboard)return;
 nodes.forEach((el,index)=>{const from=before[index],to=el.getBoundingClientRect();if(!from.width||!from.height||!to.width||!to.height||Math.abs(from.height-to.height)+Math.abs(from.width-to.width)+Math.abs(from.top-to.top)<2)return;
  el.style.transformOrigin='0 0';const animation=el.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`,opacity:.76},{transform:'none',opacity:1}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});active.set(el,animation);running.add(animation);animation.finished.catch(()=>{}).finally(()=>{running.delete(animation);if(active.get(el)===animation)active.delete(el);});
 });
}
export function morphHeight(el,update){
 const from=el.getBoundingClientRect().height;active.get(el)?.cancel();update();const to=el.getBoundingClientRect().height;
 if(reduced.matches||keyboard||Math.abs(from-to)<2)return;
 // One measured container keeps neighboring controls in normal flow throughout the transition.
 const animation=el.animate([{height:from+'px'},{height:to+'px'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});active.set(el,animation);running.add(animation);animation.finished.catch(()=>{}).finally(()=>{running.delete(animation);if(active.get(el)===animation)active.delete(el);});
}
