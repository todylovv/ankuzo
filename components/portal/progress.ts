/**
 * Pure scroll-progress math for the continuous portal experience.
 *
 * Everything here is side-effect free and framework free so it can be unit
 * tested directly with `node --test`. Behaviour must stay identical to the
 * original inline implementation in PortalExperience.tsx.
 */

/** Master progress at which the portal chapter hands over to the world. */
export const PORTAL_END = 0.22;

/** Authored chapter list — also drives the chapter navigation UI. */
export const CHAPTERS = [
  { id: "portal", label: "22", index: "00", progress: 0 },
  { id: "library", label: "LIBRARY", index: "01", progress: 0.24 },
  { id: "platforms", label: "PLATFORMS", index: "02", progress: 0.46 },
  { id: "online", label: "ONLINE", index: "03", progress: 0.63 },
  { id: "build", label: "BUILD", index: "04", progress: 0.79 },
  { id: "final", label: "22 / END", index: "05", progress: 1 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

/**
 * Upper bound (exclusive) of every chapter except the last one.
 * NOTE: these are visually tuned hand-offs and intentionally do not equal
 * `CHAPTERS[].progress`; see tests/progress.test.mjs.
 */
export const CHAPTER_BOUNDS = [
  { id: "portal", end: 0.225 },
  { id: "library", end: 0.43 },
  { id: "platforms", end: 0.6 },
  { id: "online", end: 0.76 },
  { id: "build", end: 0.91 },
] as const;

/** Last chapter, entered once every bound above has been passed. */
export const FINAL_CHAPTER: ChapterId = "final";

/** Clamp to the unit interval. NaN in, NaN out is avoided by Math.max/min ordering. */
export function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Hermite interpolation between `start` and `end`, clamped to [0, 1]. */
export function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

/** Chapter that owns the given master progress value. */
export function chapterFor(progress: number): ChapterId {
  for (const bound of CHAPTER_BOUNDS) {
    if (progress < bound.end) return bound.id;
  }
  return FINAL_CHAPTER;
}

/** Knots of the portal travel curve: [master portal progress, curve travel]. */
export const PORTAL_TRAVEL_KNOTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.25, 0.1], [0.4, 0.2], [0.55, 0.34],
  [0.7, 0.51], [0.88, 0.78], [1, 1],
];

/** Ease the linear portal progress onto the authored travel curve. */
export function remapPortalTravel(progress: number) {
  for (let index = 1; index < PORTAL_TRAVEL_KNOTS.length; index += 1) {
    const [endProgress, endTravel] = PORTAL_TRAVEL_KNOTS[index];
    if (progress <= endProgress) {
      const [startProgress, startTravel] = PORTAL_TRAVEL_KNOTS[index - 1];
      const local = smoothstep(0, 1, (progress - startProgress) / (endProgress - startProgress));
      return startTravel + (endTravel - startTravel) * local;
    }
  }
  return 1;
}
