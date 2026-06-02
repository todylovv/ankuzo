import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const psnApi = require('psn-api');
const {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getRecentlyPlayedGames,
  getProfileFromUserName,
  getUserTitles
} = psnApi;

const path = 'ps5-profile.json';
const onlineId = process.env.PSN_ONLINE_ID || 'ankkui';
const npsso = (process.env.PSN_NPSSO || '').trim();
if (!npsso) throw new Error('PSN_NPSSO secret is missing');

const accessCode = await exchangeNpssoForAccessCode(npsso);
const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
const authorization = { accessToken: tokens.accessToken };
const response = await getProfileFromUserName(authorization, onlineId);
const profile = response.profile || response;
const summary = profile.trophySummary || {};
const earned = summary.earnedTrophies || {};
const titlesResponse = await getUserTitles(authorization, profile.accountId);
const titles = titlesResponse.trophyTitles || [];
const recentResponse = await getRecentlyPlayedGames(authorization, {
  categories: ['ps5_native_game', 'ps4_game'],
  limit: 5
});
const recentGames = recentResponse.data?.gameLibraryTitlesRetrieve?.games || [];
const current = JSON.parse(fs.readFileSync(path, 'utf8'));

fs.writeFileSync(path, JSON.stringify({
  ...current,
  display_name: profile.onlineId || onlineId,
  online_id: profile.onlineId || onlineId,
  sync_status: 'SYNCED FROM PSN',
  updated: new Date().toISOString(),
  trophy_level: summary.level || 0,
  trophy_progress: summary.progress || 0,
  games_count: titlesResponse.totalItemCount || titles.length,
  trophies: {
    platinum: earned.platinum || 0,
    gold: earned.gold || 0,
    silver: earned.silver || 0,
    bronze: earned.bronze || 0
  },
  recent_games: recentGames.map(game => ({
    name: game.name,
    platform: game.platform || 'PLAYSTATION',
    icon: game.image?.url || '',
    last_played: game.lastPlayedDateTime || ''
  })),
  games: titles.map(title => ({
    name: title.trophyTitleName,
    platform: (title.trophyTitlePlatform || '').replace(/,/g, ' / '),
    icon: title.trophyTitleIconUrl || ''
  }))
}, null, 2) + '\n');
