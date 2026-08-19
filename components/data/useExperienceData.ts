"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  normalizeExperienceData,
  type ExperienceData,
  type ExperienceSnapshots,
  type ExperienceSource,
} from "@/lib/experience-data";
import {
  applyDataReviewFixture,
  parseDataReviewFixture,
} from "@/lib/experience-fixtures";

export type ExperienceDataPhase = "idle" | "loading" | "ready";
export type ExperienceSourcePhase = "idle" | "loading" | "ready" | "error";

export interface UseExperienceDataOptions {
  /** Omit to load every source, or activate sources progressively by scene. */
  enabledSources?: ExperienceSource[];
  urls?: Partial<Record<ExperienceSource, string>>;
  staleAfterMs?: number;
}

export interface UseExperienceDataResult {
  data: ExperienceData;
  phase: ExperienceDataPhase;
  sourcePhase: Record<ExperienceSource, ExperienceSourcePhase>;
  errors: Partial<Record<ExperienceSource, string>>;
  reload: () => void;
}

const SOURCES: ExperienceSource[] = ["steam", "playstation", "discord"];
const DEFAULT_URLS: Record<ExperienceSource, string> = {
  steam: "/data/steam.json",
  playstation: "/data/psn.json",
  discord: "/data/discord.json",
};

type CachedRequest = {
  payload?: unknown;
  promise?: Promise<unknown>;
};

const requestCache = new Map<string, CachedRequest>();

async function requestSnapshot(url: string, force: boolean): Promise<unknown> {
  const cached = requestCache.get(url);
  if (!force && cached?.payload !== undefined) return cached.payload;
  if (!force && cached?.promise) return cached.promise;

  const promise = fetch(url, {
    cache: force ? "reload" : "force-cache",
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Snapshot request failed (${response.status})`);
    return response.json() as Promise<unknown>;
  });

  requestCache.set(url, { payload: cached?.payload, promise });

  try {
    const payload = await promise;
    requestCache.set(url, { payload });
    return payload;
  } catch (error) {
    // Keep an earlier in-memory snapshot usable if a later refresh fails.
    requestCache.set(url, cached?.payload === undefined ? {} : { payload: cached.payload });
    if (cached?.payload !== undefined) return cached.payload;
    throw error;
  }
}

function initialSourcePhase(): Record<ExperienceSource, ExperienceSourcePhase> {
  return { steam: "idle", playstation: "idle", discord: "idle" };
}

/**
 * Lazy client adapter for the public, credential-free snapshots.
 *
 * Example scene activation:
 * `enabledSources={progress < onlineStart ? ["steam", "playstation"] : SOURCES}`
 */
export function useExperienceData(
  options: UseExperienceDataOptions = {},
): UseExperienceDataResult {
  const enabledKey = (options.enabledSources ?? SOURCES)
    .filter((source, index, list) => SOURCES.includes(source) && list.indexOf(source) === index)
    .sort()
    .join("|");
  const enabledSources = useMemo(
    () => enabledKey.split("|").filter(Boolean) as ExperienceSource[],
    [enabledKey],
  );
  const steamUrl = options.urls?.steam ?? DEFAULT_URLS.steam;
  const playstationUrl = options.urls?.playstation ?? DEFAULT_URLS.playstation;
  const discordUrl = options.urls?.discord ?? DEFAULT_URLS.discord;
  const [snapshots, setSnapshots] = useState<ExperienceSnapshots>({});
  const [sourcePhase, setSourcePhase] = useState(initialSourcePhase);
  const [errors, setErrors] = useState<Partial<Record<ExperienceSource, string>>>({});
  const [reloadRevision, setReloadRevision] = useState(0);
  const reviewFixture = useMemo(
    () =>
      parseDataReviewFixture(
        typeof window === "undefined" ? "" : window.location.search,
      ),
    [],
  );

  useEffect(() => {
    let active = true;
    const force = reloadRevision > 0;
    const urls: Record<ExperienceSource, string> = {
      steam: steamUrl,
      playstation: playstationUrl,
      discord: discordUrl,
    };

    for (const source of enabledSources) {
      void requestSnapshot(urls[source], force)
        .then((payload) => {
          if (!active) return;
          setSnapshots((current) => ({
            ...current,
            [source === "playstation" ? "psn" : source]: payload,
          }));
          setErrors((current) => {
            if (!(source in current)) return current;
            const next = { ...current };
            delete next[source];
            return next;
          });
          setSourcePhase((current) => ({ ...current, [source]: "ready" }));
        })
        .catch(() => {
          if (!active) return;
          setErrors((current) => ({ ...current, [source]: "Snapshot unavailable" }));
          setSourcePhase((current) => ({ ...current, [source]: "error" }));
        });
    }

    return () => {
      active = false;
    };
  }, [discordUrl, enabledKey, enabledSources, playstationUrl, reloadRevision, steamUrl]);

  const reviewedSnapshots = useMemo(
    () => applyDataReviewFixture(snapshots, reviewFixture),
    [reviewFixture, snapshots],
  );
  const data = useMemo(
    () =>
      normalizeExperienceData(reviewedSnapshots, {
        staleAfterMs: options.staleAfterMs,
      }),
    [options.staleAfterMs, reviewedSnapshots],
  );
  const effectiveSourcePhase = useMemo(() => {
    const effective = { ...sourcePhase };
    for (const source of enabledSources) {
      if (effective[source] === "idle") effective[source] = "loading";
    }
    return effective;
  }, [enabledSources, sourcePhase]);
  const phase: ExperienceDataPhase =
    enabledSources.length === 0
      ? "idle"
      : enabledSources.some((source) => effectiveSourcePhase[source] === "loading")
        ? "loading"
        : enabledSources.every((source) =>
              effectiveSourcePhase[source] === "ready" || effectiveSourcePhase[source] === "error"
            )
          ? "ready"
          : "idle";
  const reload = useCallback(() => setReloadRevision((revision) => revision + 1), []);

  return { data, phase, sourcePhase: effectiveSourcePhase, errors, reload };
}
