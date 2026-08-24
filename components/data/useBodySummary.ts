"use client";

import { useEffect, useState } from "react";
import type { BodySummary } from "@/components/portal/BodyCard";

/**
 * Does a published body summary exist, and what is in it.
 *
 * BodyCard already fetches its own snapshot, and deliberately so — it has to
 * stand up on its own if it is ever mounted outside the scroll. But the scroll
 * needs the answer to a question a self-fetching component cannot answer: does
 * this chapter exist at all? The body chapter is published out of a private
 * openGym instance (deploy/OPENGYM.md) that is not deployed yet, and a chapter
 * that has no data must not occupy a band of scroll — the reader would travel
 * through several hundred pixels of nothing. That decision has to be made before
 * anything is rendered, so the probe lives here, one level above the card.
 *
 * Kept out of useExperienceData on purpose. That hook normalises three account
 * snapshots into one shared shape and every consumer of it wants all three; this
 * is a single yes/no with a payload attached, and widening ExperienceSource to
 * carry it would put a scroll-sequence decision inside a data normaliser.
 */

export type BodyGate = "probing" | "present" | "absent";

export interface UseBodySummaryResult {
  summary: BodySummary | null;
  gate: BodyGate;
}

const DEFAULT_URL = "/data/body.json";

/**
 * A payload worth building a chapter around.
 *
 * The first clause is BodyCard's own test, restated so the two can never
 * disagree about whether there is a card to draw. The rest is the stricter thing
 * the chapter needs on top of it: the chapter's headline figure IS the session
 * count, so a payload without one cannot carry a chapter even though the card
 * alone would happily render the weight; and a period with no sessions, no
 * volume and no current weight is four dashes and a zero, which is precisely the
 * empty chapter this gate exists to keep off the live site. A genuine zero
 * inside a period that has something else in it is a fact and stays.
 */
function usable(payload: unknown): payload is BodySummary {
  if (!payload || typeof payload !== "object") return false;
  const summary = payload as BodySummary;
  if (summary.weight == null && summary.training == null && summary.volume == null) return false;
  const workouts = summary.training?.workouts;
  if (typeof workouts !== "number" || !Number.isFinite(workouts)) return false;
  const volume = summary.volume?.total;
  const weight = summary.weight?.current;
  return workouts > 0
    || (typeof volume === "number" && Number.isFinite(volume) && volume > 0)
    || (typeof weight === "number" && Number.isFinite(weight));
}

type Probe = {
  /** Present once the request has finished; `null` means "no usable summary". */
  settled?: BodySummary | null;
  promise?: Promise<BodySummary | null>;
};

// One request per URL per page load, the same shape useExperienceData uses for
// its three snapshots. It matters more here: BodyCard issues its own fetch for
// the same file the moment it mounts, and it only ever mounts after this probe
// has already resolved — so with `force-cache` on both sides that second request
// is served out of the HTTP cache rather than off the network.
const probes = new Map<string, Probe>();

function probe(url: string): Promise<BodySummary | null> {
  const cached = probes.get(url);
  if (cached && cached.settled !== undefined) return Promise.resolve(cached.settled);
  if (cached?.promise) return cached.promise;

  const promise = fetch(url, { cache: "force-cache", headers: { Accept: "application/json" } })
    .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
    .then((payload) => (usable(payload) ? payload : null))
    // A 404 is the expected state until openGym ships, so it is not an error
    // worth surfacing anywhere: absent and unreadable produce the same site.
    .catch(() => null);

  probes.set(url, { promise });
  void promise.then((settled) => probes.set(url, { settled }));
  return promise;
}

/**
 * Numbers chosen to exercise every branch of the card rather than to flatter it:
 * a loss rather than a gain (the one place --ember is spent), a non-zero streak,
 * a five-digit volume that has to compact, and a main lift whose weight is not a
 * whole number. `updatedAt` is stamped at module load so the fixture never trips
 * the card's own staleness threshold and the review frames stay deterministic.
 */
const REVIEW_FIXTURE: BodySummary = {
  updatedAt: new Date().toISOString(),
  unit: "kg",
  periodDays: 90,
  weight: { current: 78.4, change: -3.6 },
  training: { workouts: 41, streakWeeks: 12 },
  volume: { total: 148240 },
  mainLift: { name: "Back squat", weight: 122.5, reps: 5 },
};

/**
 * `?review=1&body=fixture`.
 *
 * Without this the body review states are unreachable — the gate correctly drops
 * them on a build with no /data/body.json, which is every build until the owner
 * deploys openGym. This is the same escape hatch lib/experience-fixtures gives
 * the other three chapters, and like those it is bound to `review=1` so it can
 * never be reached from an ordinary URL.
 */
function fixtureRequested(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("review") === "1" && params.get("body") === "fixture";
}

export function useBodySummary(url: string = DEFAULT_URL): UseBodySummaryResult {
  const fixture = fixtureRequested();
  const [state, setState] = useState<UseBodySummaryResult>(() => (
    fixture
      ? { summary: REVIEW_FIXTURE, gate: "present" }
      : { summary: null, gate: "probing" }
  ));

  useEffect(() => {
    if (fixture) return;
    let active = true;
    void probe(url).then((summary) => {
      if (!active) return;
      setState({ summary, gate: summary ? "present" : "absent" });
    });
    return () => {
      active = false;
    };
  }, [fixture, url]);

  return state;
}
