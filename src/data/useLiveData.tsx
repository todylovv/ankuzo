import { buildPsnSnapshot, type PsnProfile } from '../art/psnFacts.js';
import { toDiscordProfile, type DiscordProfile } from './discordProfile';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { recentSteamGames, seasonPeaks, isCurrentSnapshot } from "./snapshotFacts";
import { artFromMap, steamCdn, type GameArt } from "./gameArt";
import {
  type ArchiveStats,
  type Game,
} from "./games";
import { headerSocials as fallbackSocials, profileCards as fallbackCards, type ProfileCardData, type SocialLink } from "./links";

/* oxlint-disable react/only-export-components -- Hook and provider intentionally share a private context. */

type SteamGame = {
  appId?: number;
  name?: string;
  hours?: number;
  hours2w?: number;
};

type SteamProfile = {
  nickname?: string;
  profileUrl?: string;
  avatarUrl?: string;
  steamId?: string;
  online?: boolean;
  currentGame?: string;
  currentGameId?: string | number;
  games?: SteamGame[];
};

type SteamSnapshot = {
  updatedAt?: string;
  status?: string;
  stats?: { totalHours?: number; totalGames?: number };
  profiles?: SteamProfile[];
  top?: SteamGame[];
  art?: Record<string, GameArt>;
};

type FaceitSeason = {
  id?: number;
  label?: string;
  current?: boolean;
  matches?: number;
  wins?: number;
  winRate?: number;
  maxElo?: number;
};

type FaceitSnapshot = {
  updatedAt?: string;
  status?: string;
  nickname?: string;
  profileUrl?: string;
  avatarUrl?: string;
  elo?: number;
  level?: number;
  gameLabel?: string;
  lifetime?: {
    matches?: number;
    winRate?: number;
    kd?: number;
    adr?: number;
    hs?: number;
  };
  seasons?: FaceitSeason[];
};

type DiscordSnapshot = Partial<DiscordProfile> & {
  updatedAt?: string;
  status?: string;
  username?: string;
  displayName?: string;
};

type PsnEntry = {
  title?: string;
  platform?: string;
  trophyProgress?: number | null;
  trophyMatched?: boolean;
  iconUrl?: string;
};

type PsnSnapshot = {
  psnId?: string;
  updatedAt?: string;
  status?: string;
  library?: PsnEntry[];
  trophies?: { total?: number };
};

export type FaceitLive = {
  avatarUrl: string;
  nickname: string;
  profileUrl: string;
  elo: number;
  level: number;
  matches: number;
  winRate: number;
  kd: number;
  adr: number;
  hs: number;
  gameLabel: string;
  seasonPeaks: { label: string; elo: number }[];
};

export type PlayerStats = {
  psnId: string;
  nickname: string;
  avatarUrl: string;
  profileUrl: string;
  libraryGames: number;
  totalHours: number;
  activeGames: number;
  achievements: number;
  pcHours: number;
  psHours: number;
  psGames: number;
  faceit: FaceitLive;
};

type YandexMusicSnapshot = {
  updatedAt?: string;
  status?: string;
  playing?: boolean;
  title?: string;
  artist?: string;
  cover?: string;
  progressMs?: number;
  durationMs?: number;
  trackUrl?: string;
};

export type NowPlaying = {
  playing: boolean;
  title: string;
  artist: string;
  cover: string;
  elapsed: string;
  duration: string;
  progress: number;
  trackUrl?: string;
};

export type ActivityItem = {
  id: string;
  tone: "win" | "rank" | "trophy" | "complete";
  title: string;
  when: string;
  extra?: string;
};

export type DataSourceStatus = {
  hasData?: boolean;
  id: "steam" | "faceit" | "psn" | "discord" | "yandex";
  label: string;
  updatedAt?: string;
  state: "fresh" | "stale" | "unavailable" | "unknown";
};

export type LiveData = {
  psnProfile: PsnProfile;
  discordProfile: DiscordProfile;
  loading: boolean;
  games: Game[];
  mostPlayed: Game[];
  recentlyPlayed: Game[];
  archiveGames: Game[];
  archiveStats: ArchiveStats;
  profileCards: ProfileCardData[];
  headerSocials: SocialLink[];
  playerStats: PlayerStats;
  activity: ActivityItem[];
  nowPlaying: NowPlaying;
  sources: DataSourceStatus[];
};

const GITHUB_URL = "https://github.com/todylovv";

const LiveDataContext = createContext<LiveData | null>(null);

const fallbackFaceit: FaceitLive = {
  avatarUrl: "",
  nickname: "nuBac", profileUrl: "https://www.faceit.com/ru/players/nuBac",
  elo: 0, level: 0, matches: 0, winRate: 0, kd: 0, adr: 0, hs: 0,
  gameLabel: "CS2", seasonPeaks: [],
};

const fallbackPlayerStats: PlayerStats = {
  psnId: "ankkui",
  nickname: "nuBac", avatarUrl: "", profileUrl: fallbackFaceit.profileUrl,
  libraryGames: 0, totalHours: 0, activeGames: 0, achievements: 0,
  pcHours: 0, psHours: 0, psGames: 0, faceit: fallbackFaceit,
};

const fallbackNowPlaying: NowPlaying = {
  playing: false,
  title: "Ничего не играет",
  artist: "Яндекс Музыка",
  cover: "",
  elapsed: "0:00",
  duration: "0:00",
  progress: 0,
};

const fallbackLive: LiveData = {
  psnProfile: buildPsnSnapshot(null),
  discordProfile: toDiscordProfile(null),
  loading: true,
  games: [],
  mostPlayed: [],
  recentlyPlayed: [],
  archiveGames: [],
  archiveStats: { totalGames: 0, totalHours: 0, pcCount: 0, ps5Count: 0 },
  profileCards: fallbackCards,
  headerSocials: fallbackSocials,
  playerStats: fallbackPlayerStats,
  activity: [],
  nowPlaying: fallbackNowPlaying,
  sources: [
    { id: "steam", label: "Steam", state: "unknown" },
    { id: "faceit", label: "FACEIT", state: "unknown" },
    { id: "psn", label: "PlayStation", state: "unknown" },
    { id: "discord", label: "Discord", state: "unknown" },
    { id: "yandex", label: "Яндекс Музыка", state: "unknown" },
  ],
};

function sourceState(status?: string, updatedAt?: string): DataSourceStatus["state"] {
  if (status === "unavailable" || status === "error") return "unavailable";
  if (!updatedAt) return "unknown";
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(updated)) return "unknown";
  const staleAfter = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - updated > staleAfter ? "stale" : "fresh";
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function toNowPlaying(yandex: YandexMusicSnapshot | null): NowPlaying {
  const title = yandex?.title?.trim() ?? "";
  if (!title) return fallbackNowPlaying;

  const durationMs = Math.max(0, yandex?.durationMs ?? 0);
  const progressMs = Math.max(0, Math.min(durationMs || yandex?.progressMs || 0, yandex?.progressMs ?? 0));

  return {
    playing: Boolean(yandex?.playing) && isCurrentSnapshot(yandex?.updatedAt),
    title,
    artist: yandex?.artist?.trim() || "Яндекс Музыка",
    cover: yandex?.cover ?? "",
    elapsed: formatClock(progressMs),
    duration: durationMs > 0 ? formatClock(durationMs) : "0:00",
    progress: durationMs > 0 ? progressMs / durationMs : 0,
    trackUrl: yandex?.trackUrl,
  };
}

async function loadJson<T>(file: string): Promise<T | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[™®©:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function daysAgoLabel(days: number): string {
  if (days <= 0) return "СЕГОДНЯ";
  const n = Math.round(days);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "ДНЕЙ";
  if (mod10 === 1 && mod100 !== 11) word = "ДЕНЬ";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "ДНЯ";
  return `${n} ${word} НАЗАД`;
}

function prettyWhen(label: string) {
  const text = label.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function hoursAgoLabel(hours: number): string {
  if (hours < 1) return "Меньше часа назад";
  const n = Math.round(hours);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "часа";
  return `${n} ${word} назад`;
}

function snapshotDate(iso?: string) {
  const date = new Date(iso ?? "");
  return Number.isNaN(date.getTime()) ? "дата неизвестна" : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function relativeWhen(iso?: string) {
  if (!iso) return "";
  const delta = Date.now() - Date.parse(iso);
  if (!Number.isFinite(delta) || delta < 0) return "";
  const hours = delta / 3_600_000;
  if (hours < 24) return hoursAgoLabel(hours);
  return prettyWhen(daysAgoLabel(delta / 86_400_000));
}

function formatHoursShort(value: number) {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("ru-RU")} ч`;
}

function buildActivity(
  steam: SteamSnapshot | null,
  faceit: FaceitSnapshot | null,
  psn: PsnSnapshot | null,
  steamGames: SteamGame[],
  playing: string,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  const faceitWhen = relativeWhen(faceit?.updatedAt);
  const steamWhen = `За 2 недели · снимок ${snapshotDate(steam?.updatedAt)}`;

  const season = faceit?.seasons?.find((entry) => entry.current) ?? faceit?.seasons?.at(-1);
  if (season && (season.matches ?? 0) > 0) {
    items.push({
      id: "faceit-season",
      tone: "win",
      title: `FACEIT · ${season.label || faceit?.gameLabel || "CS2"}`,
      when: faceitWhen || "Недавно",
      extra: `${season.wins ?? 0}/${season.matches} побед`,
    });
  }

  if (faceit?.elo || faceit?.level) {
    items.push({
      id: "faceit-elo",
      tone: "rank",
      title: `Уровень ${faceit.level ?? "—"} в ${faceit.gameLabel || "CS2"}`,
      when: faceitWhen,
      extra: faceit.elo ? `${Math.round(faceit.elo).toLocaleString("ru-RU")} ELO` : undefined,
    });
  }

  if (playing) {
    items.push({
      id: "playing",
      tone: "complete",
      title: `Играет в ${playing}`,
      when: "Сейчас",
    });
  }

  const recentSteam = [...steamGames]
    .filter((game) => game.name && (game.hours2w ?? 0) > 0)
    .sort((a, b) => (b.hours2w ?? 0) - (a.hours2w ?? 0));

  for (const game of recentSteam) {
    if (playing && game.name === playing) continue;
    items.push({
      id: `steam-${game.appId ?? game.name}`,
      tone: "complete",
      title: `Играл в ${game.name}`,
      when: steamWhen,
      extra: formatHoursShort(game.hours2w ?? 0),
    });
  }

  const trophies = uniquePsn(psn?.library ?? [])
    .filter((item) => (item.trophyProgress ?? 0) > 0)
    .sort((a, b) => (b.trophyProgress ?? 0) - (a.trophyProgress ?? 0));

  if (trophies[0]?.title) {
    items.push({
      id: `psn-${normalizeTitle(trophies[0].title)}`,
      tone: "trophy",
      title: `Трофеи: ${trophies[0].title}`,
      when: trophies[0].platform ?? "PS5",
      extra: `${trophies[0].trophyProgress}%`,
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 4);
}

function cardImage(game: SteamGame, art?: Record<string, GameArt>) {
  if (game.appId) {
    const stored = artFromMap(game.appId, art);
    return stored.header || steamCdn(game.appId).header;
  }
  return "";
}

function toCard(
  game: SteamGame,
  playingName: string,
  favoriteName: string,
  art?: Record<string, GameArt>,
): Game {
  const title = game.name ?? "Unknown";
  const id = String(game.appId ?? title);
  const badge =
    playingName && title === playingName
      ? { label: "ИГРАЮ", tone: "playing" as const }
      : favoriteName && title === favoriteName
        ? { label: "ЛЮБИМАЯ", tone: "favorite" as const }
        : undefined;

  return {
    id,
    title,
    hours: Math.round(game.hours ?? game.hours2w ?? 0),
    hours2w: game.hours2w,
    image: cardImage(game, art),
    platform: "PC",
    badge,
  };
}

function collectSteamGames(steam: SteamSnapshot): SteamGame[] {
  const map = new Map<string, SteamGame>();

  for (const profile of steam.profiles ?? []) {
    for (const game of profile.games ?? []) {
      if (!game.name) continue;
      const key = String(game.appId ?? game.name);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...game });
        continue;
      }
      map.set(key, {
        ...prev,
        hours: (prev.hours ?? 0) + (game.hours ?? 0),
        hours2w: (prev.hours2w ?? 0) + (game.hours2w ?? 0),
      });
    }
  }

  for (const game of steam.top ?? []) {
    if (!game.name) continue;
    const key = String(game.appId ?? game.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...game });
      continue;
    }
    map.set(key, {
      ...prev,
      hours: Math.max(prev.hours ?? 0, game.hours ?? 0),
      hours2w: Math.max(prev.hours2w ?? 0, game.hours2w ?? 0),
    });
  }

  return [...map.values()];
}

function uniquePsn(library: PsnEntry[]): PsnEntry[] {
  const prefer = (platform?: string) => (platform === "PS5" ? 2 : platform === "PS4" ? 1 : 0);
  const byName = new Map<string, PsnEntry>();

  for (const item of library) {
    if (!item.title) continue;
    const key = normalizeTitle(item.title);
    const prev = byName.get(key);
    if (!prev || prefer(item.platform) > prefer(prev.platform)) {
      byName.set(key, item);
    }
  }

  return [...byName.values()].filter((item) => {
    if (item.platform !== "PS5") return false;
    return Boolean(item.trophyMatched) || (item.trophyProgress ?? 0) > 0;
  });
}

export function useLiveData(): LiveData {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error("useLiveData must be used within LiveDataProvider");
  }
  return ctx;
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveData>(fallbackLive);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadJson<SteamSnapshot>("steam.json"),
      loadJson<FaceitSnapshot>("faceit.json"),
      loadJson<DiscordSnapshot>("discord.json"),
      loadJson<PsnSnapshot>("psn.json"),
      loadJson<YandexMusicSnapshot>("yandex-music.json"),
    ])
      .then(([steam, faceit, discord, psn, yandex]) => {
        if (cancelled) return;

        const profiles = steam?.profiles ?? [];
        const top = (steam?.top ?? []).filter((game) => game.name);
        const art = steam?.art;
        const playing = isCurrentSnapshot(steam?.updatedAt)
          ? profiles.find((profile) => profile.currentGame)?.currentGame ?? "" : "";
        const recents = recentSteamGames(profiles.flatMap((profile) => profile.games ?? []));
        const favoriteName = top[0]?.name ?? "";
        const games = recents.map((game) => toCard(game, playing, favoriteName, art));

        const steamGames = steam ? collectSteamGames(steam) : [];
        const pcGames = steamGames
          .sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))
          .map((game) => toCard(game, playing, favoriteName, art));

        const ps5Games = uniquePsn(psn?.library ?? [])
          .map((item) => ({
            id: `ps5-${normalizeTitle(item.title ?? "")}`,
            title: item.title ?? "Unknown",
            hours: 0,
            image: item.iconUrl ?? "",
            platform: "PS5" as const,
          }));

        const archiveGames = [...pcGames, ...ps5Games];
        const mostPlayed = pcGames.filter((game) => game.hours > 0).slice(0, 5);
        const recentlyPlayed = recents.map((game) => ({
          ...toCard(game, playing, favoriteName, art),
          lastPlayedLabel: `За 2 недели · ${snapshotDate(steam?.updatedAt)}`,
        }));

        const totalHours = Math.round(
          steam?.stats?.totalHours ?? pcGames.reduce((sum, game) => sum + game.hours, 0),
        );
        const archiveStats: ArchiveStats = {
          totalGames: archiveGames.length,
          totalHours,
          pcCount: pcGames.length,
          ps5Count: ps5Games.length,
        };
        const activeGames = steamGames.filter((game) => (game.hours2w ?? 0) > 0).length;

        const steamProfile = profiles[0];
        const steamUrl =
          steamProfile?.profileUrl ||
          (steamProfile?.steamId ? `https://steamcommunity.com/profiles/${steamProfile.steamId}/` : "#steam");
        const faceitUrl = faceit?.profileUrl || "#faceit";
        const faceitLevel = faceit?.level ? `${faceit.level} уровень` : fallbackCards[1].subtitle;

        const profileCards: ProfileCardData[] = [
          {
            id: "steam",
            title: "Steam",
            subtitle: steamProfile?.nickname || fallbackCards[0].subtitle,
            icon: "steam",
            href: steamUrl,
          },
          {
            id: "faceit",
            title: "FACEIT",
            subtitle: faceitLevel,
            icon: "faceit",
            href: faceitUrl,
          },
          {
            id: "discord",
            title: "Discord",
            subtitle: discord?.username || discord?.displayName || fallbackCards[2].subtitle,
            icon: "discord",
            href: "#discord",
          },
          {
            id: "teamspeak",
            title: "TeamSpeak",
            subtitle: "Ankuzo",
            icon: "teamspeak",
            href: "https://tmspk.gg/3Vi7A7Y9",
          },
        ];

        const headerSocials: SocialLink[] = [
          { id: "discord", href: "#discord", label: "Discord" },
          { id: "steam", href: steamUrl, label: "Steam" },
          { id: "github", href: GITHUB_URL, label: "GitHub" },
        ];

        const faceitLive: FaceitLive = {
          avatarUrl: faceit?.avatarUrl || "",
          nickname: faceit?.nickname || fallbackFaceit.nickname,
          profileUrl: faceitUrl.startsWith("http") ? faceitUrl : fallbackFaceit.profileUrl,
          elo: faceit?.elo ?? fallbackFaceit.elo,
          level: faceit?.level ?? fallbackFaceit.level,
          matches: faceit?.lifetime?.matches ?? fallbackFaceit.matches,
          winRate: faceit?.lifetime?.winRate ?? fallbackFaceit.winRate,
          kd: faceit?.lifetime?.kd ?? fallbackFaceit.kd,
          adr: faceit?.lifetime?.adr ?? fallbackFaceit.adr,
          hs: faceit?.lifetime?.hs ?? fallbackFaceit.hs,
          gameLabel: faceit?.gameLabel || fallbackFaceit.gameLabel,
          seasonPeaks: seasonPeaks(faceit?.seasons),
        };

        const playerStats: PlayerStats = {
          psnId: psn?.psnId || "ankkui",
          nickname: faceitLive.nickname || steamProfile?.nickname || fallbackPlayerStats.nickname,
          avatarUrl: faceit?.avatarUrl || steamProfile?.avatarUrl || "",
          profileUrl: faceitLive.profileUrl,
          libraryGames: archiveStats.totalGames,
          totalHours,
          activeGames: steam ? activeGames : fallbackPlayerStats.activeGames,
          achievements: psn?.trophies?.total ?? fallbackPlayerStats.achievements,
          pcHours: totalHours,
          psHours: 0,
          psGames: psn ? ps5Games.length : fallbackPlayerStats.psGames,
          faceit: faceitLive,
        };

        const activity = buildActivity(steam, faceit, psn, steamGames, playing);

        setLive({
          psnProfile: buildPsnSnapshot(psn),
          discordProfile: toDiscordProfile(discord),
          loading: false,
          games,
          mostPlayed,
          recentlyPlayed,
          archiveGames,
          archiveStats,
          profileCards,
          headerSocials,
          playerStats,
          activity,
          nowPlaying: toNowPlaying(yandex),
          sources: [
            { id: "steam", label: "Steam", updatedAt: steam?.updatedAt, hasData: Boolean(steam), state: sourceState(steam ? steam.status : "unavailable", steam?.updatedAt) },
            { id: "faceit", label: "FACEIT", updatedAt: faceit?.updatedAt, hasData: Boolean(faceit), state: sourceState(faceit ? faceit.status : "unavailable", faceit?.updatedAt) },
            { id: "psn", label: "PlayStation", updatedAt: psn?.updatedAt, hasData: Boolean(psn), state: sourceState(psn ? psn.status : "unavailable", psn?.updatedAt) },
            { id: "discord", label: "Discord", updatedAt: discord?.updatedAt, hasData: Boolean(discord), state: sourceState(discord ? discord.status : "unavailable", discord?.updatedAt) },
            { id: "yandex", label: "Яндекс Музыка", updatedAt: yandex?.updatedAt, hasData: Boolean(yandex), state: sourceState(yandex ? yandex.status : "unavailable", yandex?.updatedAt) },
          ],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLive({ ...fallbackLive, loading: false, sources: fallbackLive.sources.map((source) => ({ ...source, state: "unavailable" })) });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <LiveDataContext.Provider value={live}>{children}</LiveDataContext.Provider>;
}
