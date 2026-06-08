import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const updatedAt = new Date().toISOString();
const steamIds = ["76561199770575251", "76561198165374024"];

async function readFallback(name, defaults) {
  try {
    return { ...defaults, ...JSON.parse(await fs.readFile(path.join(dataDir, name), "utf8")) };
  } catch {
    return defaults;
  }
}

async function writeJson(name, value) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: { Accept: "application/json", ...options.headers }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function updateSteam() {
  const fallback = await readFallback("steam.json", { profiles: [] });
  const key = (process.env.STEAM_KEY || "").trim();
  if (!key) return writeJson("steam.json", { ...fallback, updatedAt, source: "fallback", status: "unavailable" });

  const summaryParams = new URLSearchParams({ key, steamids: steamIds.join(",") });
  const summary = await requestJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${summaryParams}`
  );
  const players = new Map((summary.response?.players || []).map((player) => [player.steamid, player]));
  const profiles = [];
  const mergedGames = new Map();
  for (const steamId of steamIds) {
    const params = new URLSearchParams({
      key,
      steamid: steamId,
      include_appinfo: "true",
      include_played_free_games: "true"
    });
    const owned = await requestJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`);
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
    games.forEach((game) => {
      const current = mergedGames.get(game.appId) || { ...game, hours: 0 };
      current.hours += game.hours;
      mergedGames.set(game.appId, current);
    });
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
    updatedAt,
    source: "api",
    status: "available",
    stats: {
      totalHours: Math.round(profiles.reduce((sum, profile) => sum + profile.totalHours, 0) * 10) / 10,
      totalGames: mergedGames.size
    },
    profiles,
    top
  });
}

async function updatePsn() {
  const fallback = await readFallback("psn.json", { psnId: "ankkui", trophies: {}, library: [] });
  const npsso = (process.env.PSN_NPSSO || "").trim();
  if (!npsso) return writeJson("psn.json", { ...fallback, updatedAt, source: "fallback", status: "unavailable" });

  const {
    exchangeAccessCodeForAuthTokens,
    exchangeNpssoForAccessCode,
    getPurchasedGames,
    getProfileFromUserName,
    getUserTitles
  } = require("psn-api");
  const psnId = process.env.PSN_ONLINE_ID || "ankkui";
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
  const total = Number(earned.platinum || 0) + Number(earned.gold || 0) +
    Number(earned.silver || 0) + Number(earned.bronze || 0);

  return writeJson("psn.json", {
    updatedAt,
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
    library: purchasedGames.map((game) => {
      const trophy = titles.find((title) =>
        title.trophyTitleName && game.name &&
        title.trophyTitleName.toLowerCase() === game.name.toLowerCase()
      );
      return {
        title: game.name,
        platform: game.platform || "PlayStation",
        trophyProgress: trophy?.progress || 0,
        iconUrl: game.image?.url || trophy?.trophyTitleIconUrl || ""
      };
    })
  });
}

async function updateDiscord() {
  const fallback = await readFallback("discord.json", {
    username: "ankuz0",
    displayName: "ankuz0",
    status: "ОСНОВНОЙ СИГНАЛ",
    avatarUrl: ""
  });
  const userId = (process.env.DISCORD_USER_ID || "").trim();
  if (!userId) return writeJson("discord.json", { ...fallback, updatedAt, source: "fallback" });

  try {
    const [lanyard, profile] = await Promise.all([
      requestJson(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`),
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
      updatedAt,
      source: "api",
      username: user.username || fallback.username,
      displayName: user.global_name || user.username || fallback.displayName,
      bio: (process.env.DISCORD_BIO || "").trim() ||
        fallback.bio || "Discord — единственный активный канал связи.",
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
  } catch {
    return writeJson("discord.json", { ...fallback, updatedAt, source: "fallback", status: "unavailable" });
  }
}

async function updateFaceit() {
  const fallback = await readFallback("faceit.json", {});
  const key = (process.env.FACEIT_KEY || "").trim();
  const nickname = (process.env.FACEIT_NICKNAME || "").trim();
  if (!key || !nickname) {
    return writeJson("faceit.json", { ...fallback, updatedAt, source: "fallback", status: "unavailable" });
  }
  const player = await requestJson(
    `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  return writeJson("faceit.json", {
    updatedAt,
    source: "api",
    status: "available",
    nickname: player.nickname || nickname,
    playerId: player.player_id || "",
    country: player.country || "",
    games: player.games || {}
  });
}

async function updateTrn() {
  const fallback = await readFallback("trn.json", {});
  const key = (process.env.TRN_KEY || "").trim();
  const platform = (process.env.TRN_PLATFORM || "").trim();
  const username = (process.env.TRN_USERNAME || "").trim();
  if (!key || !platform || !username) {
    return writeJson("trn.json", { ...fallback, updatedAt, source: "fallback", status: "unavailable" });
  }
  const profile = await requestJson(
    `https://public-api.tracker.gg/v2/apex/standard/profile/${encodeURIComponent(platform)}/${encodeURIComponent(username)}`,
    { headers: { "TRN-Api-Key": key } }
  );
  return writeJson("trn.json", {
    updatedAt,
    source: "api",
    status: "available",
    platform,
    username,
    data: profile.data || {}
  });
}

const tasks = [
  ["Steam", updateSteam],
  ["PlayStation", updatePsn],
  ["Discord", updateDiscord],
  ["FACEIT", updateFaceit],
  ["TRN", updateTrn]
];

let failed = 0;
for (const [label, task] of tasks) {
  try {
    await task();
    console.log(`${label}: данные подготовлены`);
  } catch (error) {
    failed += 1;
    console.warn(`${label}: источник недоступен, сохранен предыдущий fallback (${error.message})`);
    const file = label === "PlayStation" ? "psn.json" : `${label.toLowerCase()}.json`;
    const fallback = await readFallback(file, {});
    await writeJson(file, { ...fallback, updatedAt, source: "fallback", status: "unavailable" });
  }
}

console.log(`Обновление завершено. Недоступных источников: ${failed}.`);
