const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

/** Energy leaves the silhouette, expands in screen space, then dissipates. Scroll is reversible. */
export function energyFrame(phase,person,viewport) {
  const spread=smooth(phase,.08,.92),attached=1-smooth(phase,.08,.72);
  const diffuse=smooth(phase,.10,.60)*(1-.94*smooth(phase,.82,2.8));
  const screen={x:-viewport.width*.16,y:-viewport.height*.15,width:viewport.width*1.32,height:viewport.height*1.30};
  const bounds=key=>mix(person[key],screen[key],spread);
  return {
    rect:{x:bounds('x'),y:bounds('y'),width:Math.max(1,bounds('width')),height:Math.max(1,bounds('height'))},
    attached,spread,diffuse,
    strength:Math.max(attached,diffuse),
    target:phase<.10?'character':phase<.92?'dispersing':'ambient',
  };
}
