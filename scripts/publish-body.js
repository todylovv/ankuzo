/**
 * Publish a coarse body summary out of openGym and into the site's public data.
 *
 * openGym (https://gitlab.com/DuarteSantos8/opengym, AGPL-3.0) keeps one JSON
 * file per profile at <DATA_DIR>/state-<uid>.json. That file is the whole
 * training life: every session with its date and clock times, every weigh-in,
 * every set, every note. None of that may leave this script.
 *
 * ── THE PRIVACY RULE ──────────────────────────────────────────────────────
 * Whatever this writes lands at ankuzo.online/data/body.json, which is
 * world-readable, permanently, and will be scraped and cached by people who
 * never asked. So the output is an ALLOWLIST, not a filter, and it is built
 * field by field from named fields below — never by spreading the source
 * object and never by deleting keys from a copy of it. That is the entire
 * point: openGym is under active development, and the day it adds a field for
 * injuries, sleep, resting heart rate, body-fat percentage or session notes,
 * a spread would publish it on the next timer tick and nobody would notice.
 * Built field by field, a new upstream field simply does not appear here.
 *
 * Published, and nothing else:
 *   - current weight and its change across the period
 *   - workout count for the period, and the current weekly streak
 *   - total volume lifted in the period
 *   - the main lift and its best working set
 *
 * Never published: workout dates or timestamps, session names or notes, the
 * routine plan, per-session detail, injury or health data, body measurements
 * other than weight, exercise-by-exercise history, the profile name, the
 * openGym user id. Coarse totals cannot be run backwards into a daily
 * schedule; a list of dates can, and a schedule is a fact about where a person
 * physically is at a given hour.
 *
 * Usage (see deploy/OPENGYM.md):
 *   OPENGYM_STATE=/opt/opengym/data/state-<uid>.json node scripts/publish-body.js
 *
 * Environment:
 *   OPENGYM_STATE          required — path to the openGym state file
 *   BODY_PERIOD_DAYS       optional — window for the aggregates (default 90)
 *   BODY_MAIN_LIFT_ID      optional — pin the main lift instead of picking the
 *                          highest-volume exercise of the period
 *   BODY_MAIN_LIFT_NAME    optional — label for it, when the catalogue below
 *                          cannot supply one
 *   OPENGYM_EXERCISES      optional — openGym's exercise catalogue, used only
 *                          to turn an exercise id into a human name. Either a
 *                          plain JSON array or the upstream
 *                          frontend/src/lib/exercises-data.js module.
 *
 * Failure is loud and total: a missing or malformed source exits non-zero and
 * writes nothing at all. Emitting a half-empty file instead would silently
 * blank the chapter on the site, and a blank chapter looks like a design
 * decision rather than like a broken timer.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public", "data");
const outputFile = path.join(dataDir, "body.json");
const attemptedAt = new Date().toISOString();

const DEFAULT_PERIOD_DAYS = 90;

/** Loud, deliberate failure — distinct from a crash so the message stays readable. */
class SourceError extends Error {}

function isoOf(date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

/**
 * ISO week key, ported 1:1 from openGym's frontend/src/lib/format.js so the
 * streak published here is the same number the owner sees in his own app. A
 * streak that disagrees with the source is worse than no streak.
 */
function weekKey(iso) {
  const dt = new Date(iso + "T12:00:00");
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day + 3);
  const jan4 = new Date(dt.getFullYear(), 0, 4);
  const week = 1 + Math.round(((dt - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return dt.getFullYear() + "-" + week;
}

const round1 = (value) => Math.round(value * 10) / 10;
const isNum = (value) => typeof value === "number" && Number.isFinite(value);
const isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * A warm-up row, in either spelling openGym has used. Warm-ups are excluded
 * from volume and from the best working set: a bar-only warm-up is not work,
 * and counting it would inflate both numbers against the owner's own app.
 */
function isWarmupSet(set) {
  const phase = typeof set?.phase === "string" ? set.phase.trim().toLowerCase() : "";
  if (phase) return phase === "warmup" || phase === "warm-up" || phase === "warm_up";
  return set?.warmup === true;
}

/**
 * A completed weight × reps row. Timed holds ({sec, w}) and cardio rows
 * ({min, speed}) carry no rep count, so they are simply not load volume and
 * are left out rather than coerced into zero.
 */
function isCompletedWorkRepsSet(set) {
  return (
    set?.done === true && !isWarmupSet(set) && isNum(Number(set.w)) && isNum(Number(set.r))
  );
}

/* ---------- source ---------- */

async function readState(sourcePath) {
  let raw;
  try {
    raw = await fs.readFile(sourcePath, "utf8");
  } catch (error) {
    throw new SourceError(`cannot read ${sourcePath}: ${error.message}`);
  }

  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    throw new SourceError(`${sourcePath} is not valid JSON: ${error.message}`);
  }

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new SourceError(`${sourcePath} is not an openGym state object`);
  }

  // openGym writes the store object itself at the top level (api/server.js,
  // 'PUT /api/data'), so `workouts` and `bodyweight` are the two arrays that
  // identify the file. A profile can legitimately have one and not the other,
  // but neither means this is some other file entirely — a db.json, say, which
  // holds passkey material and must never be walked by this script.
  const workouts = state.workouts;
  const bodyweight = state.bodyweight;
  const hasWorkouts = Array.isArray(workouts);
  const hasBodyweight = Array.isArray(bodyweight);
  if (!hasWorkouts && !hasBodyweight) {
    throw new SourceError(
      `${sourcePath} has neither a workouts nor a bodyweight array — this does not look like an openGym state-<uid>.json`
    );
  }
  if ((workouts !== undefined && !hasWorkouts) || (bodyweight !== undefined && !hasBodyweight)) {
    throw new SourceError(`${sourcePath}: workouts/bodyweight are present but are not arrays`);
  }

  return {
    unit: state.unit === "lb" ? "lb" : "kg",
    workouts: hasWorkouts ? workouts : [],
    bodyweight: hasBodyweight ? bodyweight : [],
    customEx: Array.isArray(state.customEx) ? state.customEx : [],
  };
}

/**
 * Exercise id → name. Only ever used for the single main lift, and only to
 * turn "0025" into something a reader can understand.
 *
 * The upstream catalogue is an ES module (`export const EXDB=[…]`) and about
 * 900 KB, so it is not a dependency of this script — it is read as text and
 * the array literal is lifted out of it when the owner points at one. A plain
 * JSON array works too. Missing or unreadable is not an error: the lift falls
 * back to its id, and the chapter still renders.
 */
async function readExerciseNames(cataloguePath) {
  if (!cataloguePath) return new Map();
  let raw;
  try {
    raw = await fs.readFile(cataloguePath, "utf8");
  } catch (error) {
    console.warn(`Body: exercise catalogue unreadable (${error.message}); falling back to ids`);
    return new Map();
  }

  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) {
    console.warn("Body: exercise catalogue holds no array; falling back to ids");
    return new Map();
  }

  let list;
  try {
    list = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    console.warn(`Body: exercise catalogue is not parseable (${error.message}); falling back to ids`);
    return new Map();
  }

  const names = new Map();
  for (const entry of Array.isArray(list) ? list : []) {
    // `n` is openGym's field for the display name; `name` is what a custom
    // exercise uses. Nothing else is read out of the catalogue.
    const id = entry?.id;
    const name = entry?.n ?? entry?.name;
    if (typeof id === "string" && typeof name === "string") names.set(id, name);
  }
  return names;
}

/* ---------- aggregates ---------- */

function weightSummary(bodyweight, cutoffIso) {
  // Entries are {d: "YYYY-MM-DD", w: number, t: epochMs}. `t` is a clock time
  // — the hour somebody stepped on a scale — and is dropped here and now.
  const entries = bodyweight
    .filter((entry) => isIsoDate(entry?.d) && isNum(Number(entry?.w)))
    .map((entry) => ({ d: entry.d, w: Number(entry.w) }))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));

  if (entries.length === 0) return { current: null, change: null };

  const current = entries[entries.length - 1];
  // The truest baseline is the last weigh-in before the window opened; without
  // one, the earliest weigh-in inside it. A single weigh-in has no change to
  // report, and reporting 0 would be a claim rather than an absence.
  const before = entries.filter((entry) => entry.d < cutoffIso);
  const inside = entries.filter((entry) => entry.d >= cutoffIso);
  const baseline = before.length > 0 ? before[before.length - 1] : inside[0];
  const change =
    baseline && baseline !== current ? round1(current.w - baseline.w) : null;

  return { current: round1(current.w), change };
}

function workoutsInPeriod(workouts, cutoffIso) {
  return workouts.filter((workout) => isIsoDate(workout?.d) && workout.d >= cutoffIso);
}

/**
 * Consecutive weeks with at least one session, counted back from this week.
 * Ported from openGym's history.js streakWeeks so it matches the owner's app:
 * the current week not having a session yet does not break the streak, any
 * earlier gap does.
 */
function streakWeeks(workouts) {
  const weeks = new Set(
    workouts.filter((workout) => isIsoDate(workout?.d)).map((workout) => weekKey(workout.d))
  );
  if (weeks.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 520; i += 1) {
    if (weeks.has(weekKey(isoOf(cursor)))) streak += 1;
    else if (i > 0) break;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function totalVolume(workouts) {
  let volume = 0;
  for (const workout of workouts) {
    for (const entry of Array.isArray(workout?.entries) ? workout.entries : []) {
      for (const set of Array.isArray(entry?.sets) ? entry.sets : []) {
        if (isCompletedWorkRepsSet(set)) volume += Number(set.w) * Number(set.r);
      }
    }
  }
  return Math.round(volume);
}

/**
 * The main lift: the exercise that took the most load volume in the period,
 * and the heaviest completed working set of it. A pinned id wins, so the owner
 * can publish the lift he actually cares about rather than the one the maths
 * happens to pick.
 */
function mainLiftSummary(workouts, { pinnedId, pinnedName, names, customEx }) {
  const volumeById = new Map();
  const bestById = new Map();

  for (const workout of workouts) {
    for (const entry of Array.isArray(workout?.entries) ? workout.entries : []) {
      const id = entry?.id;
      if (typeof id !== "string" || id === "") continue;
      for (const set of Array.isArray(entry?.sets) ? entry.sets : []) {
        if (!isCompletedWorkRepsSet(set)) continue;
        const weight = Number(set.w);
        const reps = Number(set.r);
        volumeById.set(id, (volumeById.get(id) || 0) + weight * reps);
        const best = bestById.get(id);
        // Heaviest set wins; at equal load, the one that got more reps out of it.
        if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) {
          bestById.set(id, { weight, reps });
        }
      }
    }
  }

  let id = pinnedId && bestById.has(pinnedId) ? pinnedId : null;
  if (!id) {
    if (pinnedId) {
      console.warn(`Body: pinned main lift ${pinnedId} has no completed sets in the period`);
    }
    for (const [candidate, volume] of volumeById) {
      if (!id || volume > volumeById.get(id)) id = candidate;
    }
  }
  if (!id) return null;

  const best = bestById.get(id);
  const custom = customEx.find((exercise) => exercise?.id === id);
  const name =
    pinnedName ||
    (typeof custom?.name === "string" ? custom.name : null) ||
    (typeof custom?.n === "string" ? custom.n : null) ||
    names.get(id) ||
    null;

  // Only these three fields. Not the id, not the dates it was lifted on, not
  // the routine it belongs to, not the effort ratings on the set.
  return { name, weight: round1(best.weight), reps: best.reps };
}

/* ---------- output ---------- */

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  // Write beside the target and rename over it, so a reader mid-refresh gets
  // either the old file or the new one and never half of either. update-data.sh
  // does the same thing one level up with its staging directory.
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

async function publishBody() {
  const sourcePath = (process.env.OPENGYM_STATE || "").trim();
  if (!sourcePath) {
    throw new SourceError("OPENGYM_STATE is not set — it must point at an openGym state-<uid>.json");
  }

  const periodDays = Math.max(
    1,
    Math.round(Number(process.env.BODY_PERIOD_DAYS) || DEFAULT_PERIOD_DAYS)
  );
  const state = await readState(sourcePath);
  const names = await readExerciseNames((process.env.OPENGYM_EXERCISES || "").trim());

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffIso = isoOf(cutoff);

  const period = workoutsInPeriod(state.workouts, cutoffIso);
  const weight = weightSummary(state.bodyweight, cutoffIso);
  const mainLift = mainLiftSummary(period, {
    pinnedId: (process.env.BODY_MAIN_LIFT_ID || "").trim() || null,
    pinnedName: (process.env.BODY_MAIN_LIFT_NAME || "").trim() || null,
    names,
    customEx: state.customEx,
  });

  if (weight.current === null) console.warn("Body: no weigh-ins in the source; weight omitted");
  if (period.length === 0) console.warn(`Body: no sessions in the last ${periodDays} days`);

  /*
   * THE ALLOWLIST. Every field below is named, one at a time, and its value is
   * a number, a short string or null. There is no spread of `state` here and
   * there must never be one: this object is the public contract, and anything
   * that is not written out by hand on these lines does not get published.
   *
   * `updatedAt` is when this script ran, which is a fact about the timer and
   * not about the owner — it is deliberately the only time in the file.
   */
  const body = {
    updatedAt: attemptedAt,
    lastSuccessfulAt: attemptedAt,
    lastAttemptAt: attemptedAt,
    source: "opengym",
    status: "available",
    unit: state.unit,
    periodDays,
    weight: {
      current: weight.current,
      change: weight.change,
    },
    training: {
      workouts: period.length,
      streakWeeks: streakWeeks(state.workouts),
    },
    volume: {
      total: totalVolume(period),
    },
    mainLift: mainLift
      ? { name: mainLift.name, weight: mainLift.weight, reps: mainLift.reps }
      : null,
  };

  await writeJson(outputFile, body);
  console.log(
    `Body: safe summary prepared (${body.training.workouts} sessions / ${periodDays}d, ` +
      `streak ${body.training.streakWeeks}w, volume ${body.volume.total} ${body.unit})`
  );
}

try {
  await publishBody();
} catch (error) {
  // Nothing is written on this path, on purpose. The previous body.json stays
  // exactly as it was, and the chapter keeps showing yesterday's true numbers
  // instead of today's empty ones.
  const reason = error instanceof SourceError ? error.message : (error?.stack ?? String(error));
  console.error(`Body: refusing to publish — ${reason}`);
  process.exitCode = 1;
}
