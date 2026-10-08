import assert from 'node:assert/strict';
import test from 'node:test';
import { selectDeck, filterArchive, safeExternalUrl, formatMetric } from '../src/data/artFacts.ts';

const game = (id, title, platform = 'PC') => ({ id, title, platform, hours: 0, image: '' });

test('the art deck uses recent games without pretending old favorites were played recently', () => {
  const recent = game('1', 'Recent');
  const slots = selectDeck([recent, recent], [game('2', 'Old favorite')]);
  assert.equal(slots.length, 5);
  assert.deepEqual(slots, [recent, null, null, null, null]);
  assert.equal(selectDeck([], [recent])[0], recent);
});

test('archive search and platform filters work together and preserve PSN games with unknown playtime', () => {
  const games = [game('1', 'The Last of Us'), game('2', 'The Last of Us', 'PS5'), game('3', 'ICARUS')];
  assert.deepEqual(filterArchive(games, '  LAST ', 'PS5'), [games[1]]);
  assert.equal(filterArchive(games, '', 'all').length, 3);
  assert.equal(filterArchive(games, 'missing', 'all').length, 0);
});

test('external profile links cannot execute script or use a non-HTTPS destination', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', '//evil.test', 'http://evil.test']) {
    assert.equal(safeExternalUrl(url, 'https://github.com/todylovv'), 'https://github.com/todylovv');
  }
  assert.equal(safeExternalUrl('https://steamcommunity.com/profiles/76561199770575251/'), 'https://steamcommunity.com/profiles/76561199770575251/');
});

test('missing metrics remain unknown while a reported zero is preserved', () => {
  assert.equal(formatMetric(0, true), '0');
  assert.equal(formatMetric(5277, false), '—');
  assert.equal(formatMetric(NaN, true), '—');
  assert.equal(formatMetric(5277, true).replace(/\s/g, ''), '5277');
});
