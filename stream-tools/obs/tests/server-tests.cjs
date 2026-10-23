const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const serverFile = path.join(__dirname, '../app/server.cjs');
const api = fs.existsSync(serverFile) ? require(serverFile) : {};

test('the separate controller changes scene text and controls the shared timer', async t => {
  assert.equal(typeof api.createServer, 'function', 'Local scene controller is not implemented');
  const server = api.createServer({ persist: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async data => {
    const result = await fetch(base + '/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1', Origin: base }, body: JSON.stringify(data) });
    assert.equal(result.status, 200);
    return result.json();
  };
  let state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.settings.showTimer, false);
  assert.equal(state.timer.running, false);
  state = await post({ action: 'settings', settings: { title: 'До рейда', timerLabel: 'Собираем пати', minutes: 2 } });
  assert.equal(state.settings.title, 'До рейда');
  assert.equal(state.timer.remainingMs, 120000);
  state = await post({ action: 'start' });
  assert.equal(state.timer.running, true);
  assert.equal(state.settings.showTimer, true);
  state = await post({ action: 'pause' });
  assert.equal(state.timer.running, false);
  assert.ok(state.timer.remainingMs > 119000);
  state = await post({ action: 'visibility', visible: false });
  assert.equal(state.settings.showTimer, false);
  state = await post({ action: 'reset' });
  assert.equal(state.timer.remainingMs, 120000);
  assert.equal(state.timer.running, false);
});

test('localhost service rejects other websites, invalid commands and private files', async t => {
  assert.equal(typeof api.createServer, 'function', 'Local scene controller is not implemented');
  const server = api.createServer({ persist: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const blocked = await fetch(base + '/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: '{"action":"start"}' });
  assert.equal(blocked.status, 403);
  const malformed = await fetch(base + '/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1', Origin: base }, body: '{invalid' });
  assert.equal(malformed.status, 400);
  const unknown = await fetch(base + '/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1', Origin: base }, body: '{"action":"bad"}' });
  assert.equal(unknown.status, 400);
  assert.equal((await fetch(base + '/server.cjs')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/work/site.html')).status, 404);
});
