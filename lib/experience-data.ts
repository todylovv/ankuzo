export type ExperienceSource = "steam" | "playstation" | "discord";

export type SourceAvailability =
  | "available"
  | "stale"
  | "fallback"
  | "unavailable";

export interface SourceHealth {
  availability: SourceAvailability;
  source: string;
  updatedAt?: string;
  lastSuccessfulAt?: string;
  lastAttemptAt?: string;
  ageMs?: number;
  usable: boolean;
}

export interface GameIdentity {
  id: string;
  sourceId: string;
  title: string;
  normalizedTitle: string;
  platform: "steam" | "playstation";
  platformLabel: "PC" | "PS4" | "PS5" | "PLAYSTATION";
  artwork?: string;
  icon?: string;
  hours?: number;
  trophyProgress?: number;
  trophyMatched?: boolean;
  current: boolean;
  profileSources: string[];
  rank?: number;
}

export interface SteamProfileSignal {
  id: string;
  nickname: string;
  avatar?: string;
  online: boolean;
  currentGame?: string;
  profileUrl?: string;
  gameCount?: number;
  totalHours?: number;
}

export interface SteamSignal {
  health: SourceHealth;
  profiles: SteamProfileSignal[];
  games: GameIdentity[];
  featured: GameIdentity[];
  currentGame?: GameIdentity;
  totalHours?: number;
  totalGames?: number;
}

export interface TrophySignal {
  total?: number;
  platinum?: number;
  gold?: number;
  silver?: number;
  bronze?: number;
  level?: number;
}

export interface PlayStationSignal {
  health: SourceHealth;
  onlineId?: string;
  games: GameIdentity[];
  featured: GameIdentity[];
  trophies: TrophySignal;
}

export type DiscordPresence = "online" | "idle" | "dnd" | "offline";

export interface DiscordSignal {
  health: SourceHealth;
  username?: string;
  displayName?: string;
  bio?: string;
  presence: DiscordPresence;
  avatar?: string;
  banner?: string;
  decoration?: string;
  accentColor?: string;
  badges: string[];
}

export interface PlatformOverlap {
  id: string;
  normalizedTitle: string;
  title: string;
  steam: GameIdentity;
  playstation: GameIdentity[];
  confidence: "exact";
}

export interface AuthoredExperienceFallback {
  libraryArtwork: string;
  libraryLabel: string;
  platformLabel: string;
  onlineLabel: string;
}

export interface ExperienceData {
  steam: SteamSignal;
  playstation: PlayStationSignal;
  discord: DiscordSignal;
  games: GameIdentity[];
  overlaps: PlatformOverlap[];
  authoredFallback: AuthoredExperienceFallback;
}

export interface ExperienceSnapshots {
  steam?: unknown;
  psn?: unknown;
  discord?: unknown;
}

export interface NormalizeExperienceOptions {
  now?: number;
  staleAfterMs?: number;
}

const DEFAULT_STALE_AFTER_MS = 72 * 60 * 60 * 1000;

export const AUTHORED_EXPERIENCE_FALLBACK: AuthoredExperienceFallback = {
  libraryArtwork: "/assets/library-atlas.webp",
  libraryLabel: "PERSONAL ARCHIVE",
  platformLabel: "TWO ECOSYSTEMS / ONE PERSON",
  onlineLabel: "SIGNAL QUIET",
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function integer(value: unknown): number | undefined {
  const result = finite(value);
  return result === undefined ? undefined : Math.round(result);
}

function bool(value: unknown): boolean {
  return value === true;
}

function safeUrl(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function isoDate(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

/**
 * Conservative title key shared by Steam and PlayStation matching.
 * Only exact keys are paired; the visual layer never receives fuzzy guesses.
 */
export function normalizeGameTitle(value: unknown): string {
  return String(value ?? "")
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(
      /\b(complete|deluxe|ultimate|standard|definitive|remastered|anniversary|game of the year|goty)\s+edition\b/g,
      "",
    )
    .replace(/\b(ps4|ps5|playstation 4|playstation 5)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceHealth(
  snapshot: UnknownRecord,
  hasUsablePayload: boolean,
  now: number,
  staleAfterMs: number,
): SourceHealth {
  const updatedAt = isoDate(snapshot.updatedAt);
  const lastSuccessfulAt = isoDate(snapshot.lastSuccessfulAt) ?? updatedAt;
  const lastAttemptAt = isoDate(snapshot.lastAttemptAt);
  const source = text(snapshot.source) ?? (hasUsablePayload ? "snapshot" : "authored");
  const statedStatus = text(snapshot.status)?.toLowerCase();
  const timestamp = lastSuccessfulAt ? Date.parse(lastSuccessfulAt) : Number.NaN;
  const ageMs = Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : undefined;

  let availability: SourceAvailability;
  if (!hasUsablePayload) {
    availability = "unavailable";
  } else if (statedStatus === "fallback" || source === "fallback") {
    availability = "fallback";
  } else if (statedStatus === "unavailable") {
    // Historical updater preserves its last safe payload when a refresh fails.
    availability = "fallback";
  } else if (statedStatus === "stale" || (ageMs !== undefined && ageMs > staleAfterMs)) {
    availability = "stale";
  } else {
    availability = "available";
  }

  return {
    availability,
    source,
    updatedAt,
    lastSuccessfulAt,
    lastAttemptAt,
    ageMs,
    usable: hasUsablePayload,
  };
}

function uniqueStrings(value: unknown): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))] as string[];
}

function normalizeSteam(
  input: unknown,
  now: number,
  staleAfterMs: number,
): SteamSignal {
  const snapshot = record(input);
  const rawProfiles = records(snapshot.profiles);
  const currentTitles = new Set(
    rawProfiles
      .map((profile) => normalizeGameTitle(profile.currentGame))
      .filter(Boolean),
  );

  const profiles = rawProfiles.reduce<SteamProfileSignal[]>((result, profile) => {
      const id = text(profile.steamId);
      const nickname = text(profile.nickname);
      if (!id && !nickname) return result;
      result.push({
        id: id ?? `steam-profile-${normalizeGameTitle(nickname)}`,
        nickname: nickname ?? "STEAM",
        avatar: safeUrl(profile.avatarUrl),
        online: bool(profile.online),
        currentGame: text(profile.currentGame),
        profileUrl: safeUrl(profile.profileUrl),
        gameCount: integer(profile.gameCount),
        totalHours: finite(profile.totalHours),
      });
      return result;
    }, []);

  const topRows = records(snapshot.top);
  const allRows = topRows.length
    ? topRows
    : rawProfiles.flatMap((profile) => records(profile.games));
  const gamesById = new Map<string, GameIdentity>();

  allRows.forEach((game, index) => {
    const title = text(game.name) ?? text(game.title);
    const appId = finite(game.appId);
    if (!title || appId === undefined) return;
    const normalizedTitle = normalizeGameTitle(title);
    if (!normalizedTitle) return;

    const sourceId = String(Math.trunc(appId));
    const profileSources = rawProfiles
      .filter((profile) =>
        records(profile.games).some((owned) => finite(owned.appId) === appId),
      )
      .map((profile) => text(profile.nickname) ?? text(profile.steamId))
      .filter(Boolean) as string[];

    gamesById.set(sourceId, {
      id: `steam:${sourceId}`,
      sourceId,
      title,
      normalizedTitle,
      platform: "steam",
      platformLabel: "PC",
      artwork: `https://cdn.cloudflare.steamstatic.com/steam/apps/${sourceId}/library_600x900.jpg`,
      icon: safeUrl(game.iconUrl),
      hours: finite(game.hours),
      current: currentTitles.has(normalizedTitle),
      profileSources: [...new Set(profileSources)],
      rank: index,
    });
  });

  const games = [...gamesById.values()].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return (b.hours ?? -1) - (a.hours ?? -1);
  });
  const stats = record(snapshot.stats);

  return {
    health: sourceHealth(snapshot, profiles.length > 0 || games.length > 0, now, staleAfterMs),
    profiles,
    games,
    featured: games.slice(0, 12),
    currentGame: games.find((game) => game.current),
    totalHours: finite(stats.totalHours),
    totalGames: integer(stats.totalGames),
  };
}

function playstationLabel(value: unknown): GameIdentity["platformLabel"] {
  const label = text(value)?.toUpperCase();
  if (label?.includes("PS5")) return "PS5";
  if (label?.includes("PS4")) return "PS4";
  return "PLAYSTATION";
}

function normalizePlayStation(
  input: unknown,
  now: number,
  staleAfterMs: number,
): PlayStationSignal {
  const snapshot = record(input);
  const seen = new Set<string>();
  const games = records(snapshot.library)
    .map((game, index): GameIdentity | undefined => {
      const title = text(game.title) ?? text(game.name);
      if (!title) return undefined;
      const normalizedTitle = normalizeGameTitle(title);
      if (!normalizedTitle) return undefined;
      const platformLabel = playstationLabel(game.platform);
      const key = `${normalizedTitle}:${platformLabel.toLowerCase()}`;
      if (seen.has(key)) return undefined;
      seen.add(key);
      return {
        id: `playstation:${key}`,
        sourceId: key,
        title,
        normalizedTitle,
        platform: "playstation",
        platformLabel,
        artwork: safeUrl(game.artworkUrl),
        icon: safeUrl(game.iconUrl),
        trophyProgress: finite(game.trophyProgress),
        trophyMatched: bool(game.trophyMatched),
        current: false,
        profileSources: text(snapshot.psnId) ? [text(snapshot.psnId)!] : [],
        rank: index,
      };
    })
    .filter((game): game is GameIdentity => game !== undefined);
  const trophies = record(snapshot.trophies);

  return {
    health: sourceHealth(snapshot, games.length > 0 || Boolean(text(snapshot.psnId)), now, staleAfterMs),
    onlineId: text(snapshot.psnId) ?? text(snapshot.onlineId),
    games,
    featured: games
      .slice()
      .sort((a, b) => {
        const matched = Number(Boolean(b.trophyMatched)) - Number(Boolean(a.trophyMatched));
        return matched || (b.trophyProgress ?? -1) - (a.trophyProgress ?? -1) || (a.rank ?? 0) - (b.rank ?? 0);
      })
      .slice(0, 12),
    trophies: {
      total: integer(trophies.total),
      platinum: integer(trophies.platinum),
      gold: integer(trophies.gold),
      silver: integer(trophies.silver),
      bronze: integer(trophies.bronze),
      level: integer(trophies.level),
    },
  };
}

function discordPresence(value: unknown): DiscordPresence {
  const presence = text(value)?.toLowerCase();
  return presence === "online" || presence === "idle" || presence === "dnd"
    ? presence
    : "offline";
}

function normalizeDiscord(
  input: unknown,
  now: number,
  staleAfterMs: number,
): DiscordSignal {
  const snapshot = record(input);
  const username = text(snapshot.username);
  const displayName = text(snapshot.displayName);
  const avatar = safeUrl(snapshot.avatarUrl);
  const hasPayload = Boolean(username || displayName || avatar);

  return {
    health: sourceHealth(snapshot, hasPayload, now, staleAfterMs),
    username,
    displayName,
    bio: text(snapshot.bio),
    presence: discordPresence(snapshot.presence),
    avatar,
    banner: safeUrl(snapshot.bannerUrl),
    decoration: safeUrl(snapshot.decorationUrl),
    accentColor: text(snapshot.accentColor),
    badges: uniqueStrings(snapshot.badges),
  };
}

export function findPlatformOverlaps(games: GameIdentity[]): PlatformOverlap[] {
  const steam = new Map<string, GameIdentity>();
  const playstation = new Map<string, GameIdentity[]>();

  for (const game of games) {
    // Very short keys create unsafe matches (for example numbered utilities).
    if (game.normalizedTitle.length < 5) continue;
    if (game.platform === "steam") {
      const existing = steam.get(game.normalizedTitle);
      if (!existing || (game.hours ?? 0) > (existing.hours ?? 0)) {
        steam.set(game.normalizedTitle, game);
      }
    } else {
      const group = playstation.get(game.normalizedTitle) ?? [];
      group.push(game);
      playstation.set(game.normalizedTitle, group);
    }
  }

  return [...steam.entries()]
    .filter(([key]) => playstation.has(key))
    .map(([key, steamGame]) => ({
      id: `overlap:${key}`,
      normalizedTitle: key,
      title: steamGame.title,
      steam: steamGame,
      playstation: playstation.get(key)!,
      confidence: "exact" as const,
    }))
    .sort((a, b) => (b.steam.hours ?? 0) - (a.steam.hours ?? 0));
}

export function normalizeExperienceData(
  snapshots: ExperienceSnapshots,
  options: NormalizeExperienceOptions = {},
): ExperienceData {
  const now = options.now ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const steam = normalizeSteam(snapshots.steam, now, staleAfterMs);
  const playstation = normalizePlayStation(snapshots.psn, now, staleAfterMs);
  const discord = normalizeDiscord(snapshots.discord, now, staleAfterMs);
  const games = [...steam.games, ...playstation.games];

  return {
    steam,
    playstation,
    discord,
    games,
    overlaps: findPlatformOverlaps(games),
    authoredFallback: AUTHORED_EXPERIENCE_FALLBACK,
  };
}

export function emptyExperienceData(): ExperienceData {
  return normalizeExperienceData({}, { now: 0 });
}
