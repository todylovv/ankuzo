import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAPTERS,
  CHAPTER_BOUNDS,
  FINAL_CHAPTER,
  PORTAL_END,
  PORTAL_TRAVEL_KNOTS,
  chapterFor,
  clamp,
  remapPortalTravel,
  smoothstep,
} from "../components/portal/progress.ts";

test("clamp pins values to the unit interval", () => {
  assert.equal(clamp(0), 0);
  assert.equal(clamp(1), 1);
  assert.equal(clamp(0.5), 0.5);
  assert.equal(clamp(-0.0001), 0);
  assert.equal(clamp(-1000), 0);
  assert.equal(clamp(1.0001), 1);
  assert.equal(clamp(1000), 1);
  assert.equal(clamp(Number.POSITIVE_INFINITY), 1);
  assert.equal(clamp(Number.NEGATIVE_INFINITY), 0);
});

test("smoothstep is clamped, symmetric and monotonic", () => {
  assert.equal(smoothstep(0, 1, 0), 0);
  assert.equal(smoothstep(0, 1, 1), 1);
  assert.equal(smoothstep(0, 1, -5), 0, "values before the ramp stay at 0");
  assert.equal(smoothstep(0, 1, 5), 1, "values after the ramp stay at 1");
  assert.equal(smoothstep(0, 1, 0.5), 0.5, "midpoint of the ramp is the midpoint of the output");

  // Same shape when the ramp is shifted and scaled.
  assert.equal(smoothstep(0.2, 0.6, 0.2), 0);
  assert.equal(smoothstep(0.2, 0.6, 0.6), 1);
  assert.ok(Math.abs(smoothstep(0.2, 0.6, 0.4) - 0.5) < 1e-12);

  // Zero-derivative endpoints: the curve leaves 0 and reaches 1 slower than a line.
  assert.ok(smoothstep(0, 1, 0.1) < 0.1);
  assert.ok(smoothstep(0, 1, 0.9) > 0.9);

  let previous = -1;
  for (let value = -0.2; value <= 1.2; value += 0.01) {
    const current = smoothstep(0, 1, value);
    assert.ok(current >= previous, `smoothstep decreased at ${value}`);
    assert.ok(current >= 0 && current <= 1, `smoothstep left [0,1] at ${value}`);
    previous = current;
  }
});

// The boundary values themselves are visual decisions and get re-tuned when
// the scene changes, so this pins the RULE rather than the numbers: a boundary
// belongs to the chapter that starts there, and the ends are clamped.
test("chapterFor snaps every boundary to the chapter that starts there", () => {
  assert.equal(chapterFor(0), "portal");
  assert.equal(chapterFor(-1), "portal", "progress can never fall below the portal");

  const order = [...CHAPTER_BOUNDS.map((bound) => bound.id), FINAL_CHAPTER];
  CHAPTER_BOUNDS.forEach((bound, index) => {
    const next = order[index + 1];
    assert.equal(
      chapterFor(bound.end - 0.0001), bound.id,
      `just before ${bound.end} still belongs to ${bound.id}`,
    );
    assert.equal(
      chapterFor(bound.end), next,
      `the boundary at ${bound.end} belongs to the next chapter, ${next}`,
    );
  });

  assert.equal(chapterFor(1), FINAL_CHAPTER);
  assert.equal(chapterFor(2), FINAL_CHAPTER, "overscroll stays on the final chapter");
});

test("chapterFor never moves backwards as progress grows", () => {
  const order = [...CHAPTER_BOUNDS.map((bound) => bound.id), FINAL_CHAPTER];
  let lastIndex = 0;
  for (let value = 0; value <= 1.0001; value += 0.001) {
    const index = order.indexOf(chapterFor(value));
    assert.notEqual(index, -1, `chapterFor(${value}) returned an unknown chapter`);
    assert.ok(index >= lastIndex, `chapterFor went backwards at ${value}`);
    lastIndex = index;
  }
  assert.equal(lastIndex, order.length - 1, "the sweep must end on the final chapter");
});

test("chapterFor covers exactly the authored chapter list", () => {
  const reachable = new Set();
  for (let value = 0; value <= 1.0001; value += 0.0005) reachable.add(chapterFor(value));
  assert.deepEqual([...reachable], CHAPTERS.map((chapter) => chapter.id));
});

// Audit follow-up: the hand-off thresholds (0.225 / 0.43 / 0.6 / 0.76 / 0.91) are
// NOT equal to the authored CHAPTERS[].progress (0 / 0.24 / 0.46 / 0.63 / 0.79 / 1).
// That is by design, not a desync: each threshold sits strictly between two
// neighbouring chapter targets, so a nav click always lands inside its own
// chapter while the visual hand-off happens slightly before the target. This
// test locks that invariant so a future edit to either list cannot break it.
test("chapter jump targets stay inside their own chapter band", () => {
  for (const chapter of CHAPTERS) {
    assert.equal(
      chapterFor(chapter.progress),
      chapter.id,
      `clicking "${chapter.id}" (progress ${chapter.progress}) must activate "${chapter.id}"`,
    );
  }

  const targets = CHAPTERS.map((chapter) => chapter.progress);
  assert.equal(CHAPTER_BOUNDS.length, CHAPTERS.length - 1);
  CHAPTER_BOUNDS.forEach((bound, index) => {
    assert.equal(bound.id, CHAPTERS[index].id);
    assert.ok(
      bound.end > targets[index] && bound.end < targets[index + 1],
      `bound ${bound.end} must lie strictly between targets ${targets[index]} and ${targets[index + 1]}`,
    );
  });

  const ascending = [...targets].sort((a, b) => a - b);
  assert.deepEqual(targets, ascending, "authored chapter targets must be ascending");
  assert.equal(targets[0], 0);
  assert.equal(targets.at(-1), 1);
});

test("PORTAL_END keeps the portal inside the first chapter", () => {
  assert.equal(chapterFor(PORTAL_END), "portal");
  assert.ok(PORTAL_END < CHAPTER_BOUNDS[0].end, "the portal must finish before the library hand-off");
  assert.equal(clamp(PORTAL_END / PORTAL_END), 1);
});

test("remapPortalTravel is a clamped, monotonic ease through its knots", () => {
  assert.equal(remapPortalTravel(0), 0);
  assert.equal(remapPortalTravel(1), 1);
  assert.equal(remapPortalTravel(-0.5), 0, "before the curve the camera stays parked");
  assert.equal(remapPortalTravel(2), 1, "after the curve the camera stays at the end");

  for (const [progress, travel] of PORTAL_TRAVEL_KNOTS) {
    assert.ok(
      Math.abs(remapPortalTravel(progress) - travel) < 1e-9,
      `knot ${progress} should map to ${travel}`,
    );
  }

  let previous = -1;
  for (let value = 0; value <= 1.0001; value += 0.001) {
    const current = remapPortalTravel(value);
    assert.ok(current >= previous - 1e-12, `remapPortalTravel decreased at ${value}`);
    assert.ok(current >= 0 && current <= 1, `remapPortalTravel left [0,1] at ${value}`);
    previous = current;
  }
});

test("remapPortalTravel front-loads slowly and accelerates near the breakthrough", () => {
  // Authored intent: the first half of the scroll should cover less than half of
  // the travel, so the portal lingers before the break.
  assert.ok(remapPortalTravel(0.5) < 0.5, "the first half of the scroll covers less than half the travel");
  const firstQuarter = remapPortalTravel(0.25) - remapPortalTravel(0);
  const lastQuarter = remapPortalTravel(1) - remapPortalTravel(0.75);
  assert.ok(lastQuarter > firstQuarter, "the final quarter must travel further than the first");
});
