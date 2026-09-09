import { useEffect, useState } from "react";
import { artFromMap, type GameArt } from "./gameArt";

export type RecentGame = {
  name: string;
  hours: string;
  meta: string;
  caption: string;
  art: GameArt;
};

export type CreditGame = {
  name: string;
  hours: string;
  art: GameArt;
};

export type PsnStill = {
  title: string;
  caption: string;
  art: GameArt;
};

export type ArchiveLive = {
  nowLabel: string;
  nowName: string;
  nowSub: string;
  nowCaption: string;
  nowArt: GameArt;
  monthHours: number;
  recents: RecentGame[];
  steamHours: number;
  steamGames: number;
  steamAccounts: string;
  topGame: string;
  topArt: GameArt;
  credits: CreditGame[];
  psnId: string;
  psnTotal: number;
  psnPlatinum: number;
  psnLevel: number;
  psnHighlight: string;
  psnStills: PsnStill[];
  discordName: string;
  discordStatus: string;
  discordAvatar: string;
};

type SteamGame = {
  appId?: number;
  name?: string;
  hours?: number;
  hours2w?: number;
};

type SteamProfile = {
  nickname?: string;
  currentGame?: string;
  currentGameId?: string | number;
  games?: SteamGame[];
};

type SteamSnapshot = {
  stats?: { totalHours?: number; totalGames?: number };
  profiles?: SteamProfile[];
  top?: SteamGame[];
  art?: Record<string, GameArt>;
};

type PsnSnapshot = {
  psnId?: string;
  trophies?: { total?: number; platinum?: number; level?: number };
  library?: { title?: string; trophyProgress?: number | null; iconUrl?: string }[];
};

type DiscordSnapshot = {
  username?: string;
  presence?: string;
  avatarUrl?: string;
};

const PRESENCE: Record<string, string> = {
  online: "в сети",
  idle: "отошёл",
  dnd: "не беспокоить",
  offline: "не в сети",
};

const FALLBACK: ArchiveLive = {
  nowLabel: "недавно в игре",
  nowName: "Overwatch",
  nowSub: "",
  nowCaption: "artwork / overwatch",
  nowArt: { appId: 2357570 },
  monthHours: 29,
  recents: [
    { name: "Overwatch", hours: "10 ч", meta: "две недели · PC", caption: "artwork / overwatch", art: { appId: 2357570 } },
    { name: "Arena Breakout: Infinite", hours: "10 ч", meta: "две недели · PC", caption: "artwork / arena breakout", art: { appId: 2073620 } },
    { name: "Civilization VI", hours: "4 ч", meta: "две недели · PC", caption: "artwork / civilization vi", art: { appId: 289070 } },
    { name: "Ghost Recon Breakpoint", hours: "3 ч", meta: "две недели · PC", caption: "artwork / ghost recon", art: { appId: 2231380 } },
    { name: "Cellar Keeper", hours: "2 ч", meta: "две недели · PC", caption: "artwork / cellar keeper", art: { appId: 4935510 } },
  ],
  steamHours: 5173,
  steamGames: 207,
  steamAccounts: "b1 · b2",
  topGame: "Counter-Strike 2",
  topArt: { appId: 730 },
  credits: [
    { name: "Counter-Strike 2", hours: "3265", art: { appId: 730 } },
    { name: "Apex Legends", hours: "537", art: { appId: 1172470 } },
    { name: "Rocket League", hours: "189", art: { appId: 252950 } },
    { name: "Arena Breakout: Infinite", hours: "127", art: { appId: 2073620 } },
    { name: "Sea of Thieves", hours: "98", art: { appId: 1172620 } },
    { name: "Phasmophobia", hours: "95", art: { appId: 739630 } },
  ],
  psnId: "ankkui",
  psnTotal: 187,
  psnPlatinum: 0,
  psnLevel: 64,
  psnHighlight: "",
  psnStills: [],
  discordName: "ankuz0",
  discordStatus: "не в сети",
  discordAvatar: "",
};

function cleanName(value: string) {
  return value.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
}

function captionFor(name: string) {
  return `artwork / ${cleanName(name).toLowerCase()}`;
}

function formatHours(value: number) {
  return String(Math.round(value));
}

function splitName(name: string) {
  const cleaned = cleanName(name);
  const parts = cleaned.split(/[:–—]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { main: parts[0], sub: parts.slice(1).join(" ") };
  return { main: cleaned, sub: "" };
}

function nameKey(value: string) {
  return cleanName(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\b(complete|deluxe|ultimate|standard|definitive|remastered|anniversary|game of the year|goty)\s+edition\b/g, "")
    .replace(/\b(ps4|ps5|playstation 4|playstation 5)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueGames(games: SteamGame[], limit: number) {
  const seen = new Set<string>();
  const out: SteamGame[] = [];
  for (const game of games) {
    if (!game.name) continue;
    const key = String(game.appId ?? game.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(game);
    if (out.length === limit) break;
  }
  return out;
}

function mergeLive(steam: SteamSnapshot | null, psn: PsnSnapshot | null, discord: DiscordSnapshot | null): ArchiveLive {
  if (!steam && !psn && !discord) return FALLBACK;

  const profiles = steam?.profiles ?? [];
  const artMap = steam?.art;
  const top = (steam?.top ?? []).filter((game) => game.name);
  const allGames = profiles.flatMap((profile) => profile.games ?? []);
  const playingProfile = profiles.find((profile) => profile.currentGame);
  const playing = playingProfile?.currentGame || "";
  const playingId = Number(playingProfile?.currentGameId || 0) || undefined;
  const twoWeek = new Map<string, SteamGame>();
  for (const profile of profiles) {
    for (const game of profile.games ?? []) {
      if (!game.name || !(game.hours2w && game.hours2w > 0)) continue;
      const key = String(game.appId ?? game.name);
      const current = twoWeek.get(key) || { ...game, hours2w: 0, hours: 0 };
      current.appId = game.appId || current.appId;
      current.hours2w = (current.hours2w || 0) + (game.hours2w || 0);
      current.hours = Math.max(current.hours || 0, game.hours || 0);
      twoWeek.set(key, current);
    }
  }
  const recentPool = uniqueGames(
    [
      ...[...twoWeek.values()].sort((a, b) => (b.hours2w || 0) - (a.hours2w || 0)),
      ...top,
    ],
    5,
  );
  const nowMatch =
    allGames.find((game) => playingId && game.appId === playingId) ||
    allGames.find((game) => playing && nameKey(game.name || "") === nameKey(playing)) ||
    recentPool[0];
  const nowGame = playing || nowMatch?.name || FALLBACK.nowName;
  const now = splitName(nowGame);
  const nowAppId = nowMatch?.appId || FALLBACK.nowArt.appId;
  const monthHours = Math.round(
    [...twoWeek.values()].reduce((sum, game) => sum + (game.hours2w || 0), 0),
  );
  const credits = top.slice(0, 6).map((game) => ({
    name: cleanName(game.name || ""),
    hours: formatHours(game.hours || 0),
    art: artFromMap(game.appId, artMap),
  }));
  const highlight = (psn?.library ?? []).find((game) => Number(game.trophyProgress) > 0);
  const steamByName = new Map<string, number>();
  for (const game of [...allGames, ...top]) {
    if (!game.name || !game.appId) continue;
    const key = nameKey(game.name);
    if (key && !steamByName.has(key)) steamByName.set(key, game.appId);
  }
  const psnStills: PsnStill[] = [];
  const seenPsn = new Set<string>();
  for (const item of psn?.library ?? []) {
    if (!item.title) continue;
    const key = nameKey(item.title);
    if (!key || seenPsn.has(key)) continue;
    seenPsn.add(key);
    const matchedId = steamByName.get(key);
    psnStills.push({
      title: cleanName(item.title),
      caption: `still / ${cleanName(item.title).toLowerCase()}`,
      art: artFromMap(matchedId, artMap, { image: item.iconUrl || "" }),
    });
    if (psnStills.length === 2) break;
  }

  return {
    nowLabel: playing ? "сейчас в игре" : "недавно в игре",
    nowName: now.main,
    nowSub: now.sub,
    nowCaption: captionFor(nowGame),
    nowArt: artFromMap(nowAppId, artMap),
    monthHours: monthHours || FALLBACK.monthHours,
    recents:
      recentPool.length > 0
        ? recentPool.map((game) => ({
            name: cleanName(game.name || ""),
            hours: `${formatHours(game.hours2w || game.hours || 0)} ч`,
            meta: game.hours2w ? "две недели · PC" : "Steam · PC",
            caption: captionFor(game.name || ""),
            art: artFromMap(game.appId, artMap),
          }))
        : FALLBACK.recents,
    steamHours: Math.round(steam?.stats?.totalHours || FALLBACK.steamHours),
    steamGames: steam?.stats?.totalGames || FALLBACK.steamGames,
    steamAccounts: profiles.map((profile) => profile.nickname).filter(Boolean).join(" · ") || FALLBACK.steamAccounts,
    topGame: cleanName(top[0]?.name || FALLBACK.topGame),
    topArt: artFromMap(top[0]?.appId || FALLBACK.topArt.appId, artMap),
    credits: credits.length > 0 ? credits : FALLBACK.credits,
    psnId: psn?.psnId || FALLBACK.psnId,
    psnTotal: psn?.trophies?.total ?? FALLBACK.psnTotal,
    psnPlatinum: psn?.trophies?.platinum ?? FALLBACK.psnPlatinum,
    psnLevel: psn?.trophies?.level ?? FALLBACK.psnLevel,
    psnHighlight: highlight?.title ? `${highlight.title} — ${highlight.trophyProgress}%` : FALLBACK.psnHighlight,
    psnStills,
    discordName: discord?.username || FALLBACK.discordName,
    discordStatus: PRESENCE[discord?.presence || "offline"] || FALLBACK.discordStatus,
    discordAvatar: discord?.avatarUrl || "",
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

export function useArchiveData(): ArchiveLive {
  const [live, setLive] = useState<ArchiveLive>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<SteamSnapshot>("steam.json"),
      loadJson<PsnSnapshot>("psn.json"),
      loadJson<DiscordSnapshot>("discord.json"),
    ]).then(([steam, psn, discord]) => {
      if (!cancelled) setLive(mergeLive(steam, psn, discord));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return live;
}
