/**
 * Pure scroll-progress math for the continuous portal experience.
 *
 * Everything here is side-effect free and framework free so it can be unit
 * tested directly with `node --test`. Behaviour must stay identical to the
 * original inline implementation in PortalExperience.tsx.
 */

/** Master progress at which the portal chapter hands over to the world. */
export const PORTAL_END = 0.22;

/**
 * Authored chapter list — also drives the chapter navigation UI.
 *
 * The middle is four chapters, and each is carried by a number rather than by
 * artwork. Borrowed cover art was the previous approach and it could not be
 * made to work: those images are drawn in other people's palettes and break the
 * site's colour discipline the moment they enter frame.
 *
 * `body` is the one chapter that is not guaranteed to exist. It reads a summary
 * published by scripts/publish-body.js out of a private openGym instance
 * (deploy/OPENGYM.md), and until that is deployed there is no /data/body.json to
 * read at all — so the site runs the five-chapter sequence further down instead.
 * The two lists are kept whole rather than derived from each other, because a
 * scroll sequence is authored choreography and a filtered array is not.
 */
export const CHAPTERS = [
  { id: "portal", label: "22", index: "00", progress: 0 },
  { id: "steam", label: "STEAM", index: "01", progress: 0.31 },
  { id: "playstation", label: "PLAYSTATION", index: "02", progress: 0.48 },
  { id: "presence", label: "PRESENCE", index: "03", progress: 0.64 },
  { id: "body", label: "BODY", index: "04", progress: 0.8 },
  { id: "final", label: "22 / END", index: "05", progress: 1 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export interface Chapter {
  readonly id: ChapterId;
  readonly label: string;
  readonly index: string;
  /** Jump target for the nav — the middle of the chapter, never its edge. */
  readonly progress: number;
}

export interface ChapterBound {
  readonly id: ChapterId;
  readonly end: number;
}

/**
 * Upper bound (exclusive) of every chapter except the last one.
 *
 * These are hand-offs between what the scene shows and what the copy says, so
 * they must line up with the artefact's anchors in ContinuousWorld's
 * ARTEFACT_PATH. They still do not equal `CHAPTERS[].progress` — those are jump
 * targets, aimed at the middle of a chapter rather than its edge; see
 * tests/progress.test.mjs.
 *
 * The body chapter was made room for by re-spacing, not by carving a slice out
 * of a neighbour. The portal keeps 0.225 to the digit — PORTAL_END and the
 * flythrough curve are tuned against it and nothing may move it — which leaves
 * the same 0.775 to divide between five chapters instead of four. Keeping each
 * old chapter's weight (0.225 / 0.21 / 0.2 / 0.14) and giving body the 0.2 that
 * presence has, since the two carry the same amount of copy, the five weights
 * total 0.975; every one of them therefore scales by 0.775 / 0.975 = 0.7949 and
 * the ratios between the old four survive intact. That gives 0.1788 / 0.1669 /
 * 0.1590 / 0.1590 / 0.1113, rounded here to 0.18 / 0.165 / 0.16 / 0.16 / 0.11 —
 * no chapter is within 0.002 of the exact split, and none of them is a sliver.
 */
export const CHAPTER_BOUNDS: readonly ChapterBound[] = [
  { id: "portal", end: 0.225 },
  { id: "steam", end: 0.405 },
  { id: "playstation", end: 0.57 },
  { id: "presence", end: 0.73 },
  { id: "body", end: 0.89 },
];

/**
 * The same sequence with the body chapter left out — which is exactly the
 * spacing the site shipped with before it was added.
 *
 * This is the fallback, not a degraded mode: when /data/body.json is missing the
 * reader gets the five-chapter site whole, with no dead band of scroll where the
 * sixth chapter would have been. Reverting to the old numbers rather than
 * redistributing the freed 0.16 keeps that fallback identical to a state that
 * has already been reviewed frame by frame.
 */
export const CHAPTERS_WITHOUT_BODY: readonly Chapter[] = [
  { id: "portal", label: "22", index: "00", progress: 0 },
  { id: "steam", label: "STEAM", index: "01", progress: 0.32 },
  { id: "playstation", label: "PLAYSTATION", index: "02", progress: 0.55 },
  { id: "presence", label: "PRESENCE", index: "03", progress: 0.75 },
  { id: "final", label: "22 / END", index: "04", progress: 1 },
];

export const CHAPTER_BOUNDS_WITHOUT_BODY: readonly ChapterBound[] = [
  { id: "portal", end: 0.225 },
  { id: "steam", end: 0.45 },
  { id: "playstation", end: 0.66 },
  { id: "presence", end: 0.86 },
];

/** A chapter list and its hand-offs, which are only ever meaningful together. */
export interface ChapterSequence {
  readonly chapters: readonly Chapter[];
  readonly bounds: readonly ChapterBound[];
}

export const SEQUENCE_WITH_BODY: ChapterSequence = {
  chapters: CHAPTERS,
  bounds: CHAPTER_BOUNDS,
};

export const SEQUENCE_WITHOUT_BODY: ChapterSequence = {
  chapters: CHAPTERS_WITHOUT_BODY,
  bounds: CHAPTER_BOUNDS_WITHOUT_BODY,
};

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
export function chapterFor(
  progress: number,
  bounds: readonly ChapterBound[] = CHAPTER_BOUNDS,
): ChapterId {
  for (const bound of bounds) {
    if (progress < bound.end) return bound.id;
  }
  return FINAL_CHAPTER;
}

/** The half-open band `[start, end)` a chapter occupies, or null if it has none. */
export function chapterSpan(
  id: ChapterId,
  bounds: readonly ChapterBound[] = CHAPTER_BOUNDS,
): readonly [number, number] | null {
  let start = 0;
  for (const bound of bounds) {
    if (bound.id === id) return [start, bound.end];
    start = bound.end;
  }
  return id === FINAL_CHAPTER ? [start, 1] : null;
}

/**
 * Carry a master-progress value from one chapter sequence into another, holding
 * it at the same fraction of the same chapter.
 *
 * The two sequences differ by a whole chapter, so a number authored against one
 * of them points somewhere else entirely in the other: 0.75 is four fifths of
 * the way through PRESENCE with the body chapter present, and three quarters of
 * the way through BODY without it. Anything authored as an absolute — the review
 * states, the artefact's anchors — has to be carried across rather than reused.
 *
 * Returns null when the target sequence has no such chapter, which is the honest
 * answer for a body frame on a build that has no body data: there is nothing
 * there to point at, and a nearby number would only be a plausible-looking lie.
 */
export function transposeProgress(
  value: number,
  from: readonly ChapterBound[],
  to: readonly ChapterBound[],
): number | null {
  const id = chapterFor(value, from);
  const source = chapterSpan(id, from);
  const target = chapterSpan(id, to);
  if (!source || !target) return null;
  const width = source[1] - source[0];
  const local = width > 0 ? (clamp(value) - source[0]) / width : 0;
  return target[0] + (target[1] - target[0]) * local;
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
