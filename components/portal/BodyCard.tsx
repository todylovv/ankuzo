"use client";

import { useEffect, useState } from "react";
import { useTilt } from "./useTilt";

/**
 * The body as one readable object, turned by the pointer like the game cards
 * and the Discord popout beside it.
 *
 * The other chapters of this site publish inventories — a library, a trophy
 * count, a presence. This one publishes a state, and a state is four numbers,
 * not a chart. There is deliberately no timeline here and no per-session
 * detail: /data/body.json does not carry any (scripts/publish-body.js keeps a
 * hard allowlist for exactly that reason), and a chapter that cannot show a
 * schedule cannot leak one either. What it can show is the shape of the last
 * few months, which is what somebody reading the page actually wants.
 *
 * Self-contained on purpose. It fetches its own snapshot rather than going
 * through useExperienceData, so it can be dropped into the scroll sequence
 * without widening the ExperienceSource union or touching the normaliser that
 * the other three chapters share.
 *
 * Styles live in app/body.css. That file is not imported anywhere yet — see
 * the note at the top of it.
 */

/** Exactly the fields scripts/publish-body.js is allowed to write. */
export interface BodySummary {
  updatedAt?: string;
  status?: string;
  unit?: "kg" | "lb";
  periodDays?: number;
  weight?: { current: number | null; change: number | null };
  training?: { workouts: number; streakWeeks: number };
  volume?: { total: number };
  mainLift?: { name: string | null; weight: number; reps: number } | null;
}

type Phase = "loading" | "ready" | "absent";

/** A snapshot older than this is shown, but shown as old. */
const DEFAULT_STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

const isNum = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Big figures round to a whole number; a decimal only survives where it means something. */
function figure(value: number, decimals = 0) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Volume runs to five and six digits, which is unreadable in full at this size. */
function compactVolume(value: number) {
  if (value >= 1000) return `${figure(Math.round(value / 100) / 10, 1)}k`;
  return figure(Math.round(value));
}

function useBodySummary(url: string, staleAfterMs: number) {
  const [summary, setSummary] = useState<BodySummary | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  // Age is settled once, where the snapshot arrives, rather than read off the
  // clock during render: a render is not allowed to depend on Date.now(), and
  // a card that silently flipped to "stale" on some unrelated re-render would
  // be exactly the unstable result that rule exists to prevent.
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(url, { cache: "force-cache", headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<BodySummary>;
      })
      .then((payload) => {
        if (!active) return;
        // A payload that carries none of the four aggregates is treated as
        // absent rather than rendered as a row of dashes.
        const usable =
          payload &&
          typeof payload === "object" &&
          (payload.weight != null || payload.training != null || payload.volume != null);
        const updatedAt = payload?.updatedAt ? Date.parse(payload.updatedAt) : Number.NaN;
        setStale(!Number.isNaN(updatedAt) && Date.now() - updatedAt > staleAfterMs);
        setSummary(usable ? payload : null);
        setPhase(usable ? "ready" : "absent");
      })
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setStale(false);
        setPhase("absent");
      });
    return () => {
      active = false;
    };
  }, [staleAfterMs, url]);

  return { summary, phase, stale };
}

function Metric({
  label,
  value,
  suffix,
  muted = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  muted?: boolean;
}) {
  return (
    <div className="bc-metric" data-muted={muted ? "true" : undefined}>
      <p className="bc-metric-value">
        {value}
        {suffix ? <span>{suffix}</span> : null}
      </p>
      <p className="bc-metric-label">{label}</p>
    </div>
  );
}

export function BodyCard({
  url = "/data/body.json",
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
}: {
  url?: string;
  staleAfterMs?: number;
}) {
  const { summary, phase, stale } = useBodySummary(url, staleAfterMs);
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLDivElement>(9);

  const unit = summary?.unit ?? "kg";
  const periodDays = isNum(summary?.periodDays) ? summary.periodDays : 90;
  const current = isNum(summary?.weight?.current) ? summary.weight.current : null;
  const change = isNum(summary?.weight?.change) ? summary.weight.change : null;
  const workouts = isNum(summary?.training?.workouts) ? summary.training.workouts : null;
  const streak = isNum(summary?.training?.streakWeeks) ? summary.training.streakWeeks : null;
  const volume = isNum(summary?.volume?.total) ? summary.volume.total : null;
  const lift = summary?.mainLift ?? null;
  const liftWeight = isNum(lift?.weight) ? lift.weight : null;
  const liftReps = isNum(lift?.reps) ? lift.reps : null;

  return (
    <div className="bc-stage">
      <div
        ref={ref}
        className="bc-card"
        data-phase={phase}
        data-stale={stale ? "true" : undefined}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <header className="bc-head">
          <p className="bc-kicker">Physical state</p>
          <p className="bc-period">
            {phase === "ready" ? `Last ${periodDays} days` : "—"}
          </p>
        </header>

        {/* The absent state says which of the two things happened, because
            "no data" and "no training" are different facts and only one of
            them is about the owner. */}
        {phase !== "ready" ? (
          <p className="bc-empty">
            {phase === "loading" ? "Reading the log…" : "No published summary."}
          </p>
        ) : (
          <>
            <div className="bc-weight">
              <p className="bc-weight-value">
                {current === null ? "—" : figure(current, 1)}
                <span className="bc-unit">{unit}</span>
              </p>
              {change === null ? null : (
                <p
                  className="bc-delta"
                  data-direction={change < 0 ? "down" : change > 0 ? "up" : "flat"}
                >
                  {change > 0 ? "+" : change < 0 ? "−" : "±"}
                  {figure(Math.abs(change), 1)} {unit}
                </p>
              )}
            </div>

            <div className="bc-metrics">
              <Metric
                label="Sessions"
                value={workouts === null ? "—" : figure(workouts)}
                muted={workouts === 0}
              />
              <Metric
                label="Streak"
                value={streak === null ? "—" : figure(streak)}
                suffix={streak === null ? undefined : "w"}
                muted={streak === 0}
              />
              <Metric
                label="Volume"
                value={volume === null ? "—" : compactVolume(volume)}
                suffix={volume === null ? undefined : ` ${unit}`}
                muted={volume === 0}
              />
            </div>

            {/* One lift, one set. The point of a working set is that it is a
                single honest number, so it gets a line of its own rather than
                a fourth cell in the row above. */}
            <div className="bc-lift">
              <p className="bc-lift-label">Main lift</p>
              {lift && liftWeight !== null && liftReps !== null ? (
                <p className="bc-lift-value">
                  <span className="bc-lift-name">{lift.name ?? "Unnamed"}</span>
                  <b>{figure(liftWeight, liftWeight % 1 === 0 ? 0 : 1)}</b>
                  <span className="bc-unit">{unit}</span>
                  <i>×</i>
                  <b>{figure(liftReps)}</b>
                </p>
              ) : (
                <p className="bc-lift-value bc-lift-value--empty">Nothing logged</p>
              )}
            </div>

            {stale ? <p className="bc-stale">Snapshot is out of date</p> : null}
          </>
        )}

        <span className="bc-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}
