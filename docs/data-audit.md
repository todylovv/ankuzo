# ANKUZO Platform Data Audit

Date: 2026-08-19

## Scope and evidence

The requested historical commit `c23b82f424823d5109613204d932a8d308fb7b2c` is not part of the new `ankuzo-experience` repository. It was fetched and inspected in the adjacent original repository at `../ankuzo`, together with the current original-repository implementation and the relevant history around:

- `b127a1a` — rebuilt the profile as a live static system;
- `c778b99` — restored game-service API lookups;
- `0f0b4bd` — improved profile data and interface quality;
- `c23b82f` — introduced the old bio-link landing page;
- `1674794` — current original-repository head at audit time.

Files inspected:

- `data/steam.json`
- `data/psn.json`
- `data/discord.json`
- `scripts/update-data.js`
- `.github/workflows/update-data.yml`
- `scripts/build-static.js`
- `js/card.js`
- `index.html`
- `README.md`

The current safe snapshots in the original repository are API-sourced and available:

- Steam: two profiles, 197 unique owned games, top-ten aggregate list, no current game in the latest snapshot;
- PlayStation: 219 purchased titles, 187 total trophies, 61 title/trophy matches;
- Discord: profile media available, latest presence is offline.

These counts are evidence about the available model, not values to hardcode into the new interface.

## Steam — reusable architecture

The updater uses `STEAM_KEY` only in the Node/CI process. It calls:

- `ISteamUser/GetPlayerSummaries/v2` for nickname, avatar, presence, current game and profile identity;
- `IPlayerService/GetOwnedGames/v1` for owned titles and lifetime playtime.

Reusable fields:

- multiple profiles;
- `steamId`, nickname, avatar, online state and current game;
- real `profileUrl` values;
- per-profile game count and total hours;
- owned games with `appId`, title, hours and Steam icon;
- aggregate unique-game count and total hours;
- merged top games across profiles;
- update/source/status metadata.

The merge-by-`appId` behavior is safe to retain for multiple Steam profiles. Current-game selection can prioritize a profile with `currentGame`; when absent, the authored default Library order remains in control.

The historical model only guarantees small Steam icon artwork. The new visual system needs an explicit artwork resolver and fallback policy before using larger Steam CDN images. It must not assume that every app has a working high-resolution cover.

## PlayStation — reusable architecture

The updater uses `PSN_NPSSO` only in Node/CI and `psn-api@2.18.0` to exchange authentication tokens. It obtains:

- the PSN profile by online ID;
- trophy summary and trophy titles;
- purchased PS4/PS5 library pages;
- platform and API-provided artwork;
- per-title trophy progress when a confident normalized-title match exists.

Reusable fields:

- PSN online ID;
- trophy totals, level and medal breakdown;
- purchased title, platform and artwork;
- `trophyProgress` and `trophyMatched`;
- update/source/status metadata.

The title normalizer removes Unicode marks, platform suffixes, edition words and punctuation. It is already useful for trophy matching and can seed cross-platform matching. Cross-platform duplicate detection should remain conservative: exact normalized matches can align; weak/fuzzy guesses should not.

The historical data does not provide a reliable public PlayStation profile destination or Steam-comparable playtime. Neither should be fabricated.

## Discord — reusable architecture

The updater uses a public `DISCORD_USER_ID` plus Lanyard and JAPI REST profile sources. It safely emits:

- username and display name;
- `online`, `idle`, `dnd` or `offline` presence;
- avatar, banner and avatar decoration URLs;
- bio/status, accent metadata and public badges;
- update/source/status metadata.

The old client correctly handled missing JSON and avatar load failure, and represented presence with text/semantic state in addition to color. These behaviors should remain. Discord's returned accent color should not override the ANKUZO palette.

A six-hour static snapshot is reliable but not truly realtime. It is suitable for a quiet personal signal. A new realtime backend is not justified for this pass.

## Failure and freshness behavior to retain

The historical updater has several good safety properties:

- 20-second request timeouts;
- each data source updates independently;
- a failed source keeps the previous public snapshot;
- `lastSuccessfulAt` survives a failed attempt;
- `lastAttemptAt`, `source` and `status` describe freshness/fallback state;
- missing credentials never reach the client and produce a safe unavailable snapshot;
- one failed service does not prevent other sources from updating.

The new normalized model should preserve `available`, `stale/fallback` and `unavailable` as explicit source states. The UI must never directly print raw API errors or missing values.

## Workflow adaptation for the current project

The old workflow is GitHub Pages-specific: it writes `data/*.json`, commits snapshots, builds a static `dist/`, uploads a Pages artifact and deploys it every six hours.

The current project is a Vinext/React/R3F application with a Cloudflare-oriented runtime. The updater logic is reusable, but the Pages deployment steps are not. Adaptation should be:

1. keep platform credentials in CI/server environment variables using the existing names;
2. write only safe snapshots to `public/data/*.json` so the browser can fetch them without bundling secrets;
3. keep periodic refresh at a conservative six-hour cadence;
4. run the current lint/tests/build after snapshot generation;
5. attach deployment to the actual hosting workflow later, instead of copying `configure-pages`, `upload-pages-artifact` and `deploy-pages` blindly;
6. keep the last successful committed/static snapshot as production fallback.

The new repository currently has no Git remote, so a production update/deployment workflow cannot be wired to a destination yet. Local restoration can still be completed safely.

## Normalized layer recommended for ANKUZO

The visual experience should consume one client-safe normalized object rather than source-specific JSON shapes:

- `sources`: status, source, last successful/attempt timestamps;
- `games`: stable ID, normalized title, source ID, title, platform, artwork/icon, hours, trophy progress, current state and profile source;
- `profiles`: Steam destinations and PSN identity when available;
- `discord`: display identity, presence and safe media;
- `matches`: only high-confidence Steam/PlayStation normalized-title matches.

Source-specific payloads should remain available behind the normalized layer so no useful fields are lost.

## Old UI code that must not be restored

Do not restore:

- `css/card.css` or the glass bio-link profile card;
- the old `index.html`/`stats.html` composition;
- profile-card counters, command rows or generic stats panels;
- the old hero canvas/background implementation;
- the old vertical Steam/PlayStation/Discord chapters;
- platform-branded dashboard styling.

Only retain the data fetching, parsing, safe fallback, image-error handling, public destinations and source-status semantics.

## Checkpoint 1 conclusion

Steam, PlayStation and Discord can all be restored without exposing secrets and without restoring the old visual interface. The most important implementation constraint is to separate three layers:

1. CI/server updater with credentials;
2. safe public snapshots plus normalized experience data;
3. restrained spatial signals inside the approved continuous viewport.

This checkpoint is complete. Theme-token work can proceed without guessing about the data system.
