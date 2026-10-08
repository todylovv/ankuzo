/** Coarse, local hints only. Missing browser hints are not evidence of a fast GPU. */
export function initialQuality({ reduced = false, cores = 0, memory = 0 } = {}) {
  if (reduced || (cores > 0 && cores <= 2) || (memory > 0 && memory <= 2)) return 'off';
  if (cores >= 8 && (!memory || memory >= 8)) return 'full';
  return 'motion';
}
export function parsePreference(value) {
  return ['auto', 'off', 'motion', 'full'].includes(value) ? value : 'auto';
}
/** A median and a large sample protect against isolated network/GC stalls. */
export function frameQuality(current, samples) {
  const valid = samples.filter(n => Number.isFinite(n) && n > 0 && n < 1000).sort((a,b) => a-b);
  if (valid.length < 100 || current === 'off') return current;
  const median = valid[Math.floor(valid.length / 2)];
  return median > (current === 'full' ? 28 : 45) ? (current === 'full' ? 'motion' : 'off') : current;
}
