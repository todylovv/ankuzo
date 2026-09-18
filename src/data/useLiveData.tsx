import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { artFromMap, steamCdn, type GameArt } from "./gameArt";
import {
  fallbackArchive,
  fallbackStats,
  games as fallbackGames,
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

type DiscordSnapshot = {
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
  updatedAt?: string;
  status?: string;
  library?: PsnEntry[];
  trophies?: { total?: number };
};

export type FaceitLive = {
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
};

export type PlayerStats = {
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
  id: "steam" | "faceit" | "psn" | "discord" | "yandex";
  label: string;
  updatedAt?: string;
  state: "fresh" | "stale" | "unavailable" | "unknown";
};

export type LiveData = {
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
const DAY_HINTS = [0, 3, 8, 12, 20];

const LiveDataContext = createContext<LiveData | null>(null);

const fallbackFaceit: FaceitLive = {
  nickname: "nuBac",
  profileUrl: "https://www.faceit.com/ru/players/nuBac",
  elo: 2434,
  level: 10,
  matches: 220,
  winRate: 59,
  kd: 1.3,
  adr: 94.4,
  hs: 55,
  gameLabel: "CS2",
};

const fallbackPlayerStats: PlayerStats = {
  nickname: "nuГџac",
  avatarUrl: "",
  profileUrl: fallbackFaceit.profileUrl,
  libraryGames: 12,
  totalHours: 2450,
  activeGames: 6,
  achievements: 28,
  pcHours: 1650,
  psHours: 620,
  psGames: 10,
  faceit: fallbackFaceit,
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
  games: fallbackGames,
  mostPlayed: [...fallbackArchive].sort((a, b) => b.hours - a.hours).slice(0, 5),
  recentlyPlayed: fallbackArchive.filter((game) => game.lastPlayedLabel).slice(0, 5),
  archiveGames: fallbackArchive,
  archiveStats: fallbackStats,
  profileCards: fallbackCards,
  headerSocials: fallbackSocials,
  playerStats: fallbackPlayerStats,
  activity: [
    {
      id: "faceit-season",
      tone: "win",
      title: "FACEIT · сезон 9",
      when: "Недавно",
      extra: "3/4 побед",
    },
    {
      id: "faceit-elo",
      tone: "rank",
      title: "Уровень 10 в CS2",
      when: "Недавно",
      extra: "2 434 ELO",
    },
  ],
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
    playing: Boolean(yandex?.playing),
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
    const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[в„ўВ®В©:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueGames(list: SteamGame[], limit: number) {
  const seen = new Set<string>();
  const out: SteamGame[] = [];
  for (const game of list) {
    if (!game.name) continue;
    const key = String(game.appId ?? game.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(game);
    if (out.length === limit) break;
  }
  return out;
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
  if (hours <= 0) return "Только что";
  const n = Math.round(hours);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "часа";
  return `${n} ${word} назад`;
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
  const steamWhen = relativeWhen(steam?.updatedAt) || "За 2 недели";

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
        if (cancelled || (!steam && !faceit && !discord && !psn && !yandex)) return;

        const profiles = steam?.profiles ?? [];
        const top = (steam?.top ?? []).filter((game) => game.name);
        const art = steam?.art;
        const playing = profiles.find((profile) => profile.currentGame)?.currentGame ?? "";
        const twoWeek = profiles
          .flatMap((profile) => profile.games ?? [])
          .filter((game) => game.name && (game.hours2w ?? 0) > 0)
          .sort((a, b) => (b.hours2w ?? 0) - (a.hours2w ?? 0));
        const recents = uniqueGames([...twoWeek, ...top], 5);
        const favoriteName = top[0]?.name ?? "";
        const games = recents.length > 0 ? recents.map((game) => toCard(game, playing, favoriteName, art)) : fallbackGames;

        const steamGames = steam ? collectSteamGames(steam) : [];
        const pcGames = steamGames
          .filter((game) => Math.round(game.hours ?? 0) > 0)
          .sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))
          .map((game) => toCard(game, playing, favoriteName, art));

        const steamNames = new Set(pcGames.map((game) => normalizeTitle(game.title)));
        const ps5Games = uniquePsn(psn?.library ?? [])
          .filter((item) => item.title && !steamNames.has(normalizeTitle(item.title)))
          .map((item) => ({
            id: `ps5-${normalizeTitle(item.title ?? "")}`,
            title: item.title ?? "Unknown",
            hours: 0,
            image: item.iconUrl ?? "",
            platform: "PS5" as const,
          }));

        const archiveGames = [...pcGames, ...ps5Games];
        const mostPlayed = (pcGames.length > 0 ? pcGames : fallbackArchive).slice(0, 5);
        const recentlyPlayed = recents.map((game, index) => ({
          ...toCard(game, playing, favoriteName, art),
          lastPlayedLabel: daysAgoLabel(DAY_HINTS[index] ?? 14),
        }));

        const totalHours = Math.round(
          steam?.stats?.totalHours ?? (pcGames.reduce((sum, game) => sum + game.hours, 0) || fallbackStats.totalHours),
        );
        const archiveStats: ArchiveStats = {
          totalGames: archiveGames.length || fallbackStats.totalGames,
          totalHours,
          pcCount: pcGames.length || fallbackStats.pcCount,
          ps5Count: ps5Games.length || fallbackStats.ps5Count,
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
            subtitle: discord?.displayName || discord?.username || fallbackCards[2].subtitle,
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
        };

        const playerStats: PlayerStats = {
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
          games,
          mostPlayed,
          recentlyPlayed: recentlyPlayed.length > 0 ? recentlyPlayed : fallbackLive.recentlyPlayed,
          archiveGames: archiveGames.length > 0 ? archiveGames : fallbackArchive,
          archiveStats,
          profileCards,
          headerSocials,
          playerStats,
          activity: activity.length > 0 ? activity : fallbackLive.activity,
          nowPlaying: toNowPlaying(yandex),
          sources: [
            { id: "steam", label: "Steam", updatedAt: steam?.updatedAt, state: sourceState(steam?.status, steam?.updatedAt) },
            { id: "faceit", label: "FACEIT", updatedAt: faceit?.updatedAt, state: sourceState(faceit?.status, faceit?.updatedAt) },
            { id: "psn", label: "PlayStation", updatedAt: psn?.updatedAt, state: sourceState(psn?.status, psn?.updatedAt) },
            { id: "discord", label: "Discord", updatedAt: discord?.updatedAt, state: sourceState(discord?.status, discord?.updatedAt) },
            { id: "yandex", label: "Яндекс Музыка", updatedAt: yandex?.updatedAt, state: sourceState(yandex?.status, yandex?.updatedAt) },
          ],
        });
      })
      .catch(() => {
        /* keep fallback */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <LiveDataContext.Provider value={live}>{children}</LiveDataContext.Provider>;
}
