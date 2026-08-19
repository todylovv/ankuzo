import type { ExperienceSnapshots } from "./experience-data";

export type SteamReviewState = "real" | "current" | "offline";
export type PlayStationReviewState = "real" | "available";
export type DiscordReviewState = "real" | "online" | "idle" | "offline";
export type HealthReviewState = "real" | "stale" | "fallback";
export type ImageReviewState = "real" | "failure";

export interface DataReviewFixture {
  enabled: boolean;
  steam: SteamReviewState;
  playstation: PlayStationReviewState;
  discord: DiscordReviewState;
  health: HealthReviewState;
  images: ImageReviewState;
}

export interface ApplyDataReviewFixtureOptions {
  now?: number;
}

type UnknownRecord = Record<string, unknown>;

const FAILED_IMAGE_URL = "/__review__/missing-image.webp";
const STALE_AT = "2000-01-01T00:00:00.000Z";

const DEFAULT_FIXTURE: DataReviewFixture = {
  enabled: false,
  steam: "real",
  playstation: "real",
  discord: "real",
  health: "real",
  images: "real",
};

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as UnknownRecord) }
    : {};
}

function cloneSnapshots(snapshots: ExperienceSnapshots): ExperienceSnapshots {
  return structuredClone(snapshots);
}

function queryFrom(input: URLSearchParams | URL | string): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  const queryIndex = input.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? input.slice(queryIndex + 1) : input);
}

function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Reads deterministic data-review states. Overrides are deliberately ignored
 * unless `review=1`, so production URLs always consume the real snapshots.
 *
 * Example:
 * `?review=1&steam=current&psn=available&discord=idle&health=stale&images=failure`
 */
export function parseDataReviewFixture(
  input: URLSearchParams | URL | string,
): DataReviewFixture {
  const query = queryFrom(input);
  if (query.get("review") !== "1") return { ...DEFAULT_FIXTURE };

  return {
    enabled: true,
    steam: oneOf(query.get("steam"), ["real", "current", "offline"] as const, "real"),
    playstation: oneOf(query.get("psn"), ["real", "available"] as const, "real"),
    discord: oneOf(
      query.get("discord"),
      ["real", "online", "idle", "offline"] as const,
      "real",
    ),
    health: oneOf(query.get("health"), ["real", "stale", "fallback"] as const, "real"),
    images: oneOf(query.get("images"), ["real", "failure"] as const, "real"),
  };
}

function fixtureSteam(input: unknown, state: SteamReviewState): UnknownRecord {
  const steam = record(input);
  if (state === "real") return steam;

  const rawProfiles = Array.isArray(steam.profiles) ? steam.profiles.map(record) : [];
  const rawTop = Array.isArray(steam.top) ? steam.top.map(record) : [];
  const firstGame = rawTop.find((game) => typeof game.name === "string");
  const currentTitle =
    typeof firstGame?.name === "string" && firstGame.name.trim()
      ? firstGame.name
      : "REVIEW CURRENT GAME";

  const profiles = rawProfiles.length
    ? rawProfiles
    : [{ steamId: "review-steam", nickname: "STEAM REVIEW" }];

  steam.profiles = profiles.map((profile) => ({
    ...profile,
    online: state === "current",
    currentGame: state === "current" ? currentTitle : "",
  }));

  if (state === "current" && rawTop.length === 0) {
    steam.top = [
      {
        appId: 22,
        name: currentTitle,
        hours: 22,
        iconUrl: "/assets/library-atlas.webp",
      },
    ];
  }

  return steam;
}

function fixturePlayStation(input: unknown, state: PlayStationReviewState): UnknownRecord {
  const psn = record(input);
  if (state === "real") return psn;

  const library = Array.isArray(psn.library) ? psn.library.map(record) : [];
  psn.psnId = typeof psn.psnId === "string" ? psn.psnId : "PLAYSTATION REVIEW";
  psn.library = library.length
    ? library
    : [
        {
          title: "REVIEW LIBRARY SIGNAL",
          platform: "PS5",
          trophyMatched: true,
          trophyProgress: 22,
          iconUrl: "/assets/library-atlas.webp",
        },
      ];
  return psn;
}

function fixtureDiscord(input: unknown, state: DiscordReviewState): UnknownRecord {
  const discord = record(input);
  if (state === "real") return discord;
  discord.username =
    typeof discord.username === "string" && discord.username.trim()
      ? discord.username
      : "ankuzo-review";
  discord.displayName =
    typeof discord.displayName === "string" && discord.displayName.trim()
      ? discord.displayName
      : "ANKUZO";
  discord.presence = state;
  return discord;
}

function fixtureHealth(
  input: unknown,
  state: HealthReviewState,
  nowIso: string,
): UnknownRecord {
  const snapshot = record(input);
  if (state === "real") return snapshot;

  snapshot.lastAttemptAt = nowIso;
  if (state === "stale") {
    snapshot.status = "stale";
    snapshot.source = "review-fixture";
    snapshot.updatedAt = STALE_AT;
    snapshot.lastSuccessfulAt = STALE_AT;
  } else {
    snapshot.status = "fallback";
    snapshot.source = "fallback";
    snapshot.lastSuccessfulAt =
      typeof snapshot.lastSuccessfulAt === "string"
        ? snapshot.lastSuccessfulAt
        : STALE_AT;
  }

  return snapshot;
}

function failImages(input: unknown, keys: readonly string[]): UnknownRecord {
  const snapshot = record(input);
  for (const key of keys) {
    if (key in snapshot) snapshot[key] = FAILED_IMAGE_URL;
  }
  return snapshot;
}

function fixtureImageFailures(snapshots: ExperienceSnapshots): ExperienceSnapshots {
  const steam = record(snapshots.steam);
  steam.profiles = Array.isArray(steam.profiles)
    ? steam.profiles.map((profile) => {
        const next = failImages(profile, ["avatarUrl"]);
        next.games = Array.isArray(next.games)
          ? next.games.map((game) => failImages(game, ["iconUrl", "artworkUrl"]))
          : next.games;
        return next;
      })
    : steam.profiles;
  steam.top = Array.isArray(steam.top)
    ? steam.top.map((game) => failImages(game, ["iconUrl", "artworkUrl"]))
    : steam.top;

  const psn = record(snapshots.psn);
  psn.library = Array.isArray(psn.library)
    ? psn.library.map((game) => failImages(game, ["iconUrl", "artworkUrl"]))
    : psn.library;

  const discord = failImages(snapshots.discord, [
    "avatarUrl",
    "bannerUrl",
    "decorationUrl",
  ]);

  return { steam, psn, discord };
}

export function applyDataReviewFixture(
  snapshots: ExperienceSnapshots,
  fixture: DataReviewFixture,
  options: ApplyDataReviewFixtureOptions = {},
): ExperienceSnapshots {
  if (!fixture.enabled) return snapshots;

  const nowIso = new Date(options.now ?? Date.now()).toISOString();
  let next: ExperienceSnapshots = cloneSnapshots(snapshots);
  next.steam = fixtureSteam(next.steam, fixture.steam);
  next.psn = fixturePlayStation(next.psn, fixture.playstation);
  next.discord = fixtureDiscord(next.discord, fixture.discord);

  next.steam = fixtureHealth(next.steam, fixture.health, nowIso);
  next.psn = fixtureHealth(next.psn, fixture.health, nowIso);
  next.discord = fixtureHealth(next.discord, fixture.health, nowIso);

  if (fixture.images === "failure") next = fixtureImageFailures(next);
  return next;
}

