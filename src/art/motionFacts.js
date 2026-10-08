export const CHAPTER_SPAN = 3.6;
export function phaseAt(scroll, height) {
  return height > 0 ? Math.max(0, Math.min(3, scroll / (height * CHAPTER_SPAN))) : 0;
}
export function advancePhase(current, target, dt, rate = .7) {
  const distance = target-current;
  if (Math.abs(distance)<.0002) return target;
  const elapsed = Math.max(0,Math.min(50,dt));
  const step = Math.min(Math.abs(distance)*(1-Math.exp(-elapsed/180)),elapsed*rate/1000);
  return current+Math.sign(distance)*step;
}
