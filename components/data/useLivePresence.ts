"use client";

import { useEffect, useState } from "react";
import type { DiscordPresence } from "../../lib/experience-data";

/**
 * Live Discord presence via Lanyard.
 *
 * The committed snapshot in public/data is refreshed on a schedule, so it can
 * only ever say what was true hours ago. Lanyard reports the current state, and
 * the page is about presence — a status that is stale is not a status.
 *
 * Lanyard only tracks people who have joined its own Discord server, so a 404
 * is an expected answer rather than a failure: the caller keeps the snapshot.
 */

const LANYARD_URL = "https://api.lanyard.rest/v1/users";
const POLL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 8_000;

export interface LivePresence {
  presence: DiscordPresence;
  activity?: string;
  activityDetail?: string;
}

function readPresence(value: unknown): DiscordPresence | undefined {
  return value === "online" || value === "idle" || value === "dnd" || value === "offline"
    ? value
    : undefined;
}

function readActivity(activities: unknown): Pick<LivePresence, "activity" | "activityDetail"> {
  if (!Array.isArray(activities)) return {};
  for (const entry of activities) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    // type 4 is a custom status, which is a mood rather than an activity.
    if (record.type === 4) continue;
    const name = typeof record.name === "string" ? record.name : undefined;
    if (!name) continue;
    const details = typeof record.details === "string" ? record.details : undefined;
    const state = typeof record.state === "string" ? record.state : undefined;
    return { activity: name, activityDetail: details ?? state };
  }
  return {};
}

export function useLivePresence(discordId?: string): LivePresence | null {
  const [live, setLive] = useState<LivePresence | null>(null);

  useEffect(() => {
    if (!discordId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`${LANYARD_URL}/${encodeURIComponent(discordId)}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!active) return;
        if (response.ok) {
          const payload = (await response.json()) as { data?: Record<string, unknown> };
          const presence = readPresence(payload.data?.discord_status);
          if (presence) setLive({ presence, ...readActivity(payload.data?.activities) });
        } else if (response.status === 404) {
          // Not monitored: nothing is wrong, there is simply nothing live to show.
          setLive(null);
        }
      } catch {
        // Network hiccup or timeout — keep whatever is already on screen.
      }
      if (active) timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [discordId]);

  return live;
}
