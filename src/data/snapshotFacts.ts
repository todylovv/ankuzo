type RecentGame = { appId?: number; name?: string; hours?: number; hours2w?: number };

export function recentSteamGames(games: RecentGame[]): RecentGame[] {
  const merged = new Map<string, RecentGame>();
  for (const game of games) {
    if (!game.name) continue;
    const key = String(game.appId ?? game.name);
    const previous = merged.get(key);
    merged.set(key, {
      ...game,
      hours: (previous?.hours ?? 0) + (game.hours ?? 0),
      hours2w: (previous?.hours2w ?? 0) + (game.hours2w ?? 0),
    });
  }
  return [...merged.values()].filter((game) => Number.isFinite(game.hours2w) && (game.hours2w ?? 0) > 0)
    .sort((a, b) => (b.hours2w ?? 0) - (a.hours2w ?? 0)).slice(0, 5);
}

export function seasonPeaks(seasons: { id?: number; label?: string; maxElo?: number }[] = []) {
  return seasons
    .filter((season) => Number.isFinite(season.maxElo) && (season.maxElo ?? 0) > 0)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    .map((season) => ({ label: season.label || `Сезон ${season.id ?? '—'}`, elo: season.maxElo! }));
}

export function isCurrentSnapshot(updatedAt?: string, now = Date.now()) {
  const age = now - Date.parse(updatedAt ?? '');
  return Number.isFinite(age) && age >= 0 && age <= 5 * 60 * 1000;
}
