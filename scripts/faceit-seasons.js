const CS2_SEASONS = [
  { id: 1, start: Date.parse("2023-09-28T00:00:00Z") },
  { id: 2, start: Date.parse("2024-02-16T14:00:00Z") },
  { id: 3, start: Date.parse("2024-07-04T00:00:00Z") },
  { id: 4, start: Date.parse("2024-11-14T00:00:00Z") },
  { id: 5, start: Date.parse("2025-04-08T00:00:00Z") },
  { id: 6, start: Date.parse("2025-07-24T00:00:00Z") },
  { id: 7, start: Date.parse("2025-11-19T13:00:00Z") },
  { id: 8, start: Date.parse("2026-04-22T00:00:00Z") },
  { id: 9, start: Date.parse("2026-08-05T00:00:00Z") },
];

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function levelFromElo(elo) {
  const n = Number(elo);
  if (!Number.isFinite(n) || n <= 500) return 1;
  if (n <= 750) return 2;
  if (n <= 900) return 3;
  if (n <= 1050) return 4;
  if (n <= 1200) return 5;
  if (n <= 1350) return 6;
  if (n <= 1530) return 7;
  if (n <= 1750) return 8;
  if (n <= 2000) return 9;
  return 10;
}

export function assignEloValues(matches, history) {
  const points = (history || [])
    .map((point) => ({
      matchId: point.matchId || point.match_id || "",
      elo: Number(point.elo),
      at: Number(point.at),
    }))
    .filter((point) => Number.isFinite(point.elo));

  const byId = new Map();
  for (const point of points) {
    if (point.matchId) byId.set(point.matchId, point.elo);
  }

  const timed = points.filter((point) => Number.isFinite(point.at));

  return matches.map((match) => {
    if (match.matchId && byId.has(match.matchId)) {
      return { ...match, eloValue: byId.get(match.matchId) };
    }
    const time = Number(match.finishedAt);
    if (!Number.isFinite(time) || timed.length === 0) return { ...match };
    let best = timed[0];
    let bestDist = Math.abs(best.at - time);
    for (const point of timed) {
      const dist = Math.abs(point.at - time);
      if (dist < bestDist) {
        best = point;
        bestDist = dist;
      }
    }
    return { ...match, eloValue: best.elo };
  });
}

export function seasonAt(ms, seasons = CS2_SEASONS) {
  const time = Number(ms);
  if (!Number.isFinite(time)) return null;
  let found = null;
  for (const season of seasons) {
    if (time >= season.start) found = season;
  }
  return found;
}

export function aggregateSeasons(matches, now = Date.now(), seasons = CS2_SEASONS, currentElo = 0) {
  const currentId = seasonAt(now, seasons)?.id;
  const buckets = new Map();

  for (const match of matches) {
    if (!match?.elo) continue;
    const season = seasonAt(match.finishedAt, seasons);
    if (!season) continue;
    const bucket = buckets.get(season.id) || {
      id: season.id,
      matches: 0,
      wins: 0,
      kdSum: 0,
      adrSum: 0,
      hsSum: 0,
      maxElo: 0,
    };
    bucket.matches += 1;
    if (match.won) bucket.wins += 1;
    bucket.kdSum += Number(match.kd) || 0;
    bucket.adrSum += Number(match.adr) || 0;
    bucket.hsSum += Number(match.hs) || 0;
    const eloValue = Number(match.eloValue);
    if (Number.isFinite(eloValue) && eloValue > bucket.maxElo) bucket.maxElo = eloValue;
    buckets.set(season.id, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => a.id - b.id)
    .map((bucket) => {
      let maxElo = bucket.maxElo;
      if (bucket.id === currentId && Number(currentElo) > maxElo) maxElo = Number(currentElo);
      return {
        id: bucket.id,
        label: `сезон ${bucket.id}`,
        current: bucket.id === currentId,
        matches: bucket.matches,
        wins: bucket.wins,
        winRate: bucket.matches ? Math.round((bucket.wins / bucket.matches) * 100) : 0,
        kd: bucket.matches ? round(bucket.kdSum / bucket.matches, 1) : 0,
        adr: bucket.matches ? Math.round(bucket.adrSum / bucket.matches) : 0,
        hs: bucket.matches ? Math.round(bucket.hsSum / bucket.matches) : 0,
        maxElo,
      };
    });
}
