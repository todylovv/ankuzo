export function clampLevel(level: number): number {
  const n = Math.round(Number(level) || 1);
  return Math.min(10, Math.max(1, n));
}

export function levelFromElo(elo: number): number {
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

export function colorForLevel(level: number): string {
  const n = clampLevel(level);
  if (n <= 1) return "#9b9b9b";
  if (n <= 3) return "#1ce400";
  if (n <= 7) return "#ffc800";
  if (n <= 9) return "#fe6300";
  return "#ee2946";
}

export function colorForElo(elo: number): string {
  return colorForLevel(levelFromElo(elo));
}

export function seasonMaxElo(season: { maxElo?: number }): number {
  return Number(season.maxElo) || 0;
}
