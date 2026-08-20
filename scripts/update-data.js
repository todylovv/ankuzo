import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public", "data");
const attemptedAt = new Date().toISOString();
const defaultSteamIds = ["76561199770575251", "76561198165374024"];

function readSteamIds() {
  const configured = (process.env.STEAM_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d{17}$/.test(value));

  return configured.length > 0 ? [...new Set(configured)] : defaultSteamIds;
}

const steamIds = readSteamIds();

async function readFallback(name, defaults) {
  try {
    const current = JSON.parse(await fs.readFile(path.join(dataDir, name), "utf8"));
    return { ...defaults, ...current };
  } catch {
    return defaults;
  }
}

async function writeJson(name, value) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function unavailable(fallback) {
  return {
    ...fallback,
    lastAttemptAt: attemptedAt,
    source: "fallback",
    status: "unavailable"
  };
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(
      /\b(complete|deluxe|ultimate|standard|definitive|remastered|anniversary|game of the year|goty)\s+edition\b/g,
      ""
    )
    .replace(/\b(ps4|ps5|playstation 4|playstation 5)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "application/json", ...options.headers }
  });

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

async function updateSteam() {
  const fallback = await readFallback("steam.json", { profiles: [], top: [] });
  const key = (process.env.STEAM_KEY || "").trim();
  if (!key) return writeJson("steam.json", unavailable(fallback));

  const summaryParams = new URLSearchParams({ key, steamids: steamIds.join(",") });
  const summary = await requestJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${summaryParams}`
  );
  const players = new Map(
    (summary.response?.players || []).map((player) => [player.steamid, player])
  );
  const profiles = [];
  const mergedGames = new Map();

  for (const steamId of steamIds) {
    const params = new URLSearchParams({
      key,
      steamid: steamId,
      include_appinfo: "true",
      include_played_free_games: "true"
    });
    const owned = await requestJson(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`
    );
    const games = (owned.response?.games || [])
      .map((game) => ({
        appId: game.appid,
        name: game.name || `App ${game.appid}`,
        hours: Math.round((game.playtime_forever || 0) / 6) / 10,
        iconUrl: game.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
          : ""
      }))
      .sort((a, b) => b.hours - a.hours);

    for (const game of games) {
      const current = mergedGames.get(game.appId) || { ...game, hours: 0 };
      current.hours += game.hours;
      mergedGames.set(game.appId, current);
    }

    const player = players.get(steamId) || {};
    profiles.push({
      steamId,
      nickname: player.personaname || steamId,
      avatarUrl: player.avatarfull || "",
      online: Number(player.personastate || 0) > 0,
      currentGame: player.gameextrainfo || "",
      profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
      gameCount: owned.response?.game_count || games.length,
      totalHours: Math.round(games.reduce((sum, game) => sum + game.hours, 0) * 10) / 10,
      games
    });
  }

  const top = [...mergedGames.values()].sort((a, b) => b.hours - a.hours).slice(0, 10);
  return writeJson("steam.json", {
    updatedAt: attemptedAt,
    lastSuccessfulAt: attemptedAt,
    lastAttemptAt: attemptedAt,
    source: "api",
    status: "available",
    stats: {
      totalHours:
        Math.round(profiles.reduce((sum, profile) => sum + profile.totalHours, 0) * 10) / 10,
      totalGames: mergedGames.size
    },
    profiles,
    top
  });
}

async function updatePsn() {
  const fallback = await readFallback("psn.json", {
    psnId: "ankkui",
    trophies: {},
    library: []
  });
  const npsso = (process.env.PSN_NPSSO || "").trim();
  if (!npsso) return writeJson("psn.json", unavailable(fallback));

  const {
    exchangeAccessCodeForAuthTokens,
    exchangeNpssoForAccessCode,
    getPurchasedGames,
    getProfileFromUserName,
    getUserTitles
  } = require("psn-api");
  const psnId = (process.env.PSN_ONLINE_ID || "ankkui").trim();
  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
  const authorization = { accessToken: tokens.accessToken };
  const profileResponse = await getProfileFromUserName(authorization, psnId);
  const profile = profileResponse.profile || profileResponse;
  const summary = profile.trophySummary || {};
  const earned = summary.earnedTrophies || {};
  const titlesResponse = await getUserTitles(authorization, profile.accountId);
  const titles = titlesResponse.trophyTitles || [];
  const purchasedGames = [];

  for (let start = 0; start < 2400; start += 24) {
    const purchasedResponse = await getPurchasedGames(authorization, {
      size: 24,
      start,
      platform: ["ps4", "ps5"],
      sortBy: "ACTIVE_DATE",
      sortDirection: "desc"
    });
    const page = purchasedResponse.data?.purchasedTitlesRetrieve?.games || [];
    purchasedGames.push(...page);
    if (page.length < 24) break;
  }

  const total =
    Number(earned.platinum || 0) +
    Number(earned.gold || 0) +
    Number(earned.silver || 0) +
    Number(earned.bronze || 0);
  const trophyTitles = new Map();

  for (const title of titles) {
    const normalized = normalizeTitle(title.trophyTitleName);
    if (!normalized) continue;
    const current = trophyTitles.get(normalized);
    if (!current || Number(title.progress || 0) > Number(current.progress || 0)) {
      trophyTitles.set(normalized, title);
    }
  }

  const uniquePurchasedGames = new Map();
  for (const game of purchasedGames) {
    const platform = Array.isArray(game.platform)
      ? game.platform.join("/")
      : game.platform || "PlayStation";
    const key = `${normalizeTitle(game.name)}|${String(platform).toLowerCase()}`;
    if (key !== "|playstation" && !uniquePurchasedGames.has(key)) {
      uniquePurchasedGames.set(key, { game, platform });
    }
  }

  return writeJson("psn.json", {
    updatedAt: attemptedAt,
    lastSuccessfulAt: attemptedAt,
    lastAttemptAt: attemptedAt,
    source: "api",
    status: "available",
    psnId: profile.onlineId || psnId,
    trophies: {
      total,
      platinum: earned.platinum || 0,
      gold: earned.gold || 0,
      silver: earned.silver || 0,
      bronze: earned.bronze || 0,
      level: summary.level || 0
    },
    library: [...uniquePurchasedGames.values()].map(({ game, platform }) => {
      const trophy = trophyTitles.get(normalizeTitle(game.name));
      return {
        title: game.name,
        platform,
        trophyProgress: trophy ? Number(trophy.progress || 0) : null,
        trophyMatched: Boolean(trophy),
        iconUrl: game.image?.url || trophy?.trophyTitleIconUrl || ""
      };
    })
  });
}

async function updateDiscord() {
  const fallback = await readFallback("discord.json", {
    username: "ankuz0",
    displayName: "ankuz0",
    bio: "Discord — основной канал связи.",
    presence: "offline",
    avatarUrl: "",
    bannerUrl: "",
    decorationUrl: "",
    badges: []
  });
  const userId = (process.env.DISCORD_USER_ID || "").trim();
  if (!userId) return writeJson("discord.json", unavailable(fallback));

  // Lanyard only tracks people who joined its own Discord server, so a 404 is
  // a normal answer rather than a failure — and it must not take the profile
  // down with it, because japi carries everything except live presence.
  const [lanyard, profile] = await Promise.all([
    requestJson(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`)
      .catch(() => ({})),
    requestJson(`https://japi.rest/discord/v1/user/${encodeURIComponent(userId)}`)
  ]);
  const user = profile.data || lanyard.data?.discord_user || {};
  const presence = lanyard.data?.discord_status || "offline";
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.webp?size=256`
    : "";
  const bannerUrl = user.banner
    ? `https://cdn.discordapp.com/banners/${userId}/${user.banner}.webp?size=1024`
    : "";
  const decorationUrl = user.avatar_decoration_data?.asset
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=512&passthrough=true`
    : "";

  return writeJson("discord.json", {
    updatedAt: attemptedAt,
    lastSuccessfulAt: attemptedAt,
    lastAttemptAt: attemptedAt,
    source: "api",
    status: "available",
    username: user.username || fallback.username,
    displayName: user.global_name || user.username || fallback.displayName,
    bio: (process.env.DISCORD_BIO || "").trim() || "Discord — основной канал связи.",
    presence,
    avatarUrl,
    bannerUrl,
    decorationUrl,
    accentColor: user.accent_color || "#6f7bf7",
    badges: [
      ...(user.public_flags_array || []),
      ...(user.collectibles?.nameplate ? ["Discord Nameplate"] : [])
    ]
  });
}

const sources = [
  { label: "Steam", file: "steam.json", update: updateSteam },
  { label: "PlayStation", file: "psn.json", update: updatePsn },
  { label: "Discord", file: "discord.json", update: updateDiscord }
];

let unavailableCount = 0;
for (const source of sources) {
  try {
    await source.update();
    console.log(`${source.label}: safe snapshot prepared`);
  } catch {
    unavailableCount += 1;
    const fallback = await readFallback(source.file, {});
    await writeJson(source.file, unavailable(fallback));
    console.warn(`${source.label}: unavailable; previous safe snapshot preserved`);
  }
}

console.log(`Update finished. Unavailable sources: ${unavailableCount}.`);
