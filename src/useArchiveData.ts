import { useEffect, useState } from "react";
import { artFromMap, type GameArt } from "./gameArt";

export type RecentGame = {
  name: string;
  hours: string;
  meta: string;
  art: GameArt;
};

export type CreditGame = {
  name: string;
  hours: string;
  art: GameArt;
};

export type PsnStill = {
  title: string;
  art: GameArt;
};

export type ArchiveLive = {
  playing: boolean;
  nowLabel: string;
  nowName: string;
  nowSub: string;
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
  psnGold: number;
  psnSilver: number;
  psnBronze: number;
  psnLevel: number;
  psnHighlight: string;
  psnStills: PsnStill[];
  discordName: string;
  discordDisplay: string;
  discordBio: string;
  discordStatus: string;
  discordAvatar: string;
  discordBanner: string;
  discordDecoration: string;
  discordBadges: string[];
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
  trophies?: { total?: number; platinum?: number; gold?: number; silver?: number; bronze?: number; level?: number };
  library?: { title?: string; trophyProgress?: number | null; iconUrl?: string }[];
};

type DiscordSnapshot = {
  username?: string;
  displayName?: string;
  bio?: string;
  presence?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  decorationUrl?: string;
  badges?: string[];
};

const PRESENCE: Record<string, string> = {
  online: "в сети",
  idle: "отошёл",
  dnd: "не беспокоить",
  offline: "не в сети",
};

const FALLBACK: ArchiveLive = {
  playing: false,
  nowLabel: "недавно в игре",
  nowName: "Overwatch",
  nowSub: "",
  nowArt: { appId: 2357570 },
  monthHours: 29,
  recents: [
    { name: "Overwatch", hours: "10 ч", meta: "две недели · PC", art: { appId: 2357570 } },
    { name: "Arena Breakout: Infinite", hours: "10 ч", meta: "две недели · PC", art: { appId: 2073620 } },
    { name: "Civilization VI", hours: "4 ч", meta: "две недели · PC", art: { appId: 289070 } },
    { name: "Ghost Recon Breakpoint", hours: "3 ч", meta: "две недели · PC", art: { appId: 2231380 } },
    { name: "Cellar Keeper", hours: "2 ч", meta: "две недели · PC", art: { appId: 4935510 } },
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
  psnGold: 8,
  psnSilver: 25,
  psnBronze: 154,
  psnLevel: 64,
  psnHighlight: "",
  psnStills: [],
  discordName: "ankuz0",
  discordDisplay: "Interpretation of Youngness",
  discordBio: "Discord — основной канал связи.",
  discordStatus: "не в сети",
  discordAvatar: "",
  discordBanner: "",
  discordDecoration: "",
  discordBadges: ["храбрость", "nitro", "табличка"],
};

function cleanName(value: string) {
  return value.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
}

const BADGE_LABEL: Record<string, string> = {
  HOUSE_BRAVERY: "храбрость",
  HOUSE_BRILLIANCE: "блеск",
  HOUSE_BALANCE: "равновесие",
  NITRO: "nitro",
  "Discord Nameplate": "табличка",
};

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

function psnKey(value: string): string {
  return nameKey(
    cleanName(value)
      .replace(/S\.T\.A\.L\.K\.E\.R\.?/gi, "stalker")
      .replace(/WATCH[_\s-]*DOGS/gi, "watch dogs")
      .replace(/\bresynced\b/gi, "")
      .replace(/assassin['’`s]{0,2}\s*creed(?:\s*(?:iv|4))?\s*black\s*flag/gi, "assassins creed black flag"),
  );
}

function displayPsnTitle(value: string): string {
  return cleanName(value)
    .replace(/S\.T\.A\.L\.K\.E\.R\.?/gi, "STALKER")
    .replace(/\bStalker\b/gi, "STALKER")
    .replace(/\s*Resynced/gi, "")
    .replace(/WATCH_DOGS/gi, "Watch Dogs")
    .replace(/Assassin['’]s Creed(?:\s+IV)?\s+Black Flag/i, "Assassin's Creed IV Black Flag")
    .replace(/\s+/g, " ")
    .trim();
}

const PSN_STILL_LIMIT = 36;

function collectPsnStills(
  library: PsnSnapshot["library"],
  steamGames: SteamGame[],
  artMap: SteamSnapshot["art"],
): PsnStill[] {
  const steamByName = new Map<string, number>();
  for (const game of steamGames) {
    if (!game.name || !game.appId) continue;
    for (const key of [nameKey(game.name), psnKey(game.name)]) {
      if (key && !steamByName.has(key)) steamByName.set(key, game.appId);
    }
  }

  const stills: PsnStill[] = [];
  const seen = new Set<string>();
  for (const item of library ?? []) {
    if (!item.title) continue;
    const key = psnKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    stills.push({
      title: displayPsnTitle(item.title),
      art: artFromMap(steamByName.get(key) || steamByName.get(nameKey(item.title)), artMap, {
        image: item.iconUrl || "",
      }),
    });
    if (stills.length === PSN_STILL_LIMIT) break;
  }
  return stills;
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
  const highlight = (psn?.library ?? []).find((game) => Number(game.trophyProgress) >= 40);
  const psnStills = collectPsnStills(psn?.library, [...allGames, ...top], artMap);

  const badges = (discord?.badges ?? [])
    .map((badge) => BADGE_LABEL[badge] || badge.toLowerCase().replace(/_/g, " "))
    .filter(Boolean);

  return {
    playing: Boolean(playing),
    nowLabel: playing ? "сейчас в игре" : "недавно в игре",
    nowName: now.main,
    nowSub: now.sub,
    nowArt: artFromMap(nowAppId, artMap),
    monthHours: monthHours || FALLBACK.monthHours,
    recents:
      recentPool.length > 0
        ? recentPool.map((game) => ({
            name: cleanName(game.name || ""),
            hours: `${formatHours(game.hours2w || game.hours || 0)} ч`,
            meta: game.hours2w ? "две недели · PC" : "Steam · PC",
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
    psnGold: psn?.trophies?.gold ?? FALLBACK.psnGold,
    psnSilver: psn?.trophies?.silver ?? FALLBACK.psnSilver,
    psnBronze: psn?.trophies?.bronze ?? FALLBACK.psnBronze,
    psnLevel: psn?.trophies?.level ?? FALLBACK.psnLevel,
    psnHighlight: highlight?.title ? `${highlight.title} — ${highlight.trophyProgress}%` : FALLBACK.psnHighlight,
    psnStills,
    discordName: discord?.username || FALLBACK.discordName,
    discordDisplay: discord?.displayName || discord?.username || FALLBACK.discordDisplay,
    discordBio: discord?.bio || FALLBACK.discordBio,
    discordStatus: PRESENCE[discord?.presence || "offline"] || FALLBACK.discordStatus,
    discordAvatar: discord?.avatarUrl || "",
    discordBanner: discord?.bannerUrl || "",
    discordDecoration: discord?.decorationUrl || "",
    discordBadges: badges.length > 0 ? badges : FALLBACK.discordBadges,
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
