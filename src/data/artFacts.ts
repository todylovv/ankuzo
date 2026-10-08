import type { Game } from './games';

export function selectDeck(recent: Game[], mostPlayed: Game[]): (Game | null)[] {
  const pool = recent.length ? recent : mostPlayed;
  const unique = [...new Map(pool.map(game => [game.id, game])).values()].slice(0, 5);
  return Array.from({ length: 5 }, (_, i) => unique[i] ?? null);
}
export function filterArchive(games: Game[], query: string, platform: string): Game[] {
  const search = query.trim().normalize('NFKC').toLocaleLowerCase('ru');
  return games.filter(game => (platform === 'all' || game.platform === platform)
    && game.title.normalize('NFKC').toLocaleLowerCase('ru').includes(search));
}
export function safeExternalUrl(url: string, fallback = ''): string {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : fallback; }
  catch { return fallback; }
}
export function formatMetric(value: number, available: boolean): string {
  return available && Number.isFinite(value) ? Math.round(value).toLocaleString('ru-RU') : '—';
}
