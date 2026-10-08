const smooth = (x, a, b) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;

/** Scroll owns the handoff; time only animates the energy within it. */
export function energyFrame(phase, person, deck, moving) {
  const handoff=smooth(phase,.22,.94),travel=smooth(phase,1.08,1.40);
  const bounds=key=>mix(mix(person[key],deck[key],handoff),moving[key],travel);
  return {
    rect:{x:bounds('x'),y:bounds('y'),width:Math.max(1,bounds('width')),height:Math.max(1,bounds('height'))},
    mask:handoff,
    strength:mix(1,.58,smooth(phase,.15,1.05)),
    target:phase<.22?'character':phase<1.08?'deck':'traveller',
  };
}
