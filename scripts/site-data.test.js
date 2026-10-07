import assert from 'node:assert/strict';
import test from 'node:test';
import { recentSteamGames, seasonPeaks, isCurrentSnapshot } from '../src/data/snapshotFacts.ts';

test('recent games include only the reported two-week window, merging accounts', () => {
  const games = recentSteamGames([
    { appId: 1, name: 'Old favorite', hours: 1000, hours2w: 0 },
    { appId: 2, name: 'Recent', hours: 20, hours2w: 2 },
    { appId: 2, name: 'Recent', hours: 10, hours2w: 3 },
    { appId: 3, name: 'Other', hours: 10, hours2w: 4 },
  ]);
  assert.deepEqual(games.map(({ appId, hours, hours2w }) => ({ appId, hours, hours2w })), [
    { appId: 2, hours: 30, hours2w: 5 },
    { appId: 3, hours: 10, hours2w: 4 },
  ]);
  assert.deepEqual(recentSteamGames([]), []);
});

test('ELO history contains only known season peaks, in season order', () => {
  assert.deepEqual(seasonPeaks([
    { id: 9, label: 'Сезон 9', maxElo: 2508 },
    { id: 4, maxElo: 0 },
    { id: 7, maxElo: 2400 },
    { id: 6 },
  ]), [{ label: 'Сезон 7', elo: 2400 }, { label: 'Сезон 9', elo: 2508 }]);
  assert.deepEqual(seasonPeaks(), []);
});

test('a stale, invalid, or future snapshot cannot claim someone is playing now', () => {
  const now = Date.parse('2026-10-07T10:00:00Z');
  assert.equal(isCurrentSnapshot('2026-10-07T09:59:00Z', now), true);
  for (const date of [undefined, 'invalid', '2026-09-01T00:00:00Z', '2026-10-08T00:00:00Z']) {
    assert.equal(isCurrentSnapshot(date, now), false);
  }
});
