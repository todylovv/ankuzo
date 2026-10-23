const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../app/server.cjs');
const key = 'test-administrator-capability';
async function start(t, extra = {}) {
  const server = createServer({ persist: false, controlKey: key, edgeAuth: true, ...extra });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const admin = { Authorization: `Bearer ${key}` };
  const mutation = { ...admin, Origin: base, 'X-Ankuzo-Control': '1', 'Content-Type': 'application/json' };
  return { base, admin, mutation };
}
async function link(base, admin) {
  const response = await fetch(base + '/api/obs-link', { headers: admin });
  assert.equal(response.status, 200, 'Administrator can obtain an OBS link');
  return (await response.json()).url;
}
test('private OBS link opens the complete scene without an administrator login', async t => {
  const { base, admin } = await start(t);
  const url = await link(base, admin);
  assert.equal(new URL(url).username, '');
  assert.equal(new URL(url).password, '');
  const scene = await fetch(url);
  assert.equal(scene.status, 200);
  assert.match(await scene.text(), /id="stage"/);
  assert.equal(scene.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(scene.headers.get('cache-control'), 'no-store');
  for (const route of ['scene.js', 'scene.css', 'smoke.js', 'timer.js', 'assets/head.png', 'assets/onest-cyrillic.woff2', 'api/state']) {
    const response = await fetch(new URL(route, url));
    assert.equal(response.status, 200, route);
    assert.ok(!(await response.text()).includes(url), 'Scene resources never include the private link');
  }
});
test('viewer access cannot reach the panel or make changes, even with forged administrator headers', async t => {
  const { base, admin, mutation } = await start(t);
  const url = await link(base, admin);
  for (const route of ['control.html', 'control.js', 'control.css', 'api/obs-link', 'server.cjs', 'settings.json']) {
    assert.equal((await fetch(new URL(route, url), { headers: admin })).status, 403, route);
  }
  for (const route of ['api/control', 'api/obs-link']) {
    assert.equal((await fetch(new URL(route, url), { method: 'POST', headers: mutation, body: '{"action":"start"}' })).status, 403, route);
  }
  const state = await (await fetch(new URL('api/state', url))).json();
  assert.equal(state.timer.running, false);
  assert.equal(Object.hasOwn(state, 'requiresControlKey'), false);
});
test('anonymous requests and invalid viewer credentials cannot read private routes', async t => {
  const { base, admin } = await start(t);
  const url = await link(base, admin);
  for (const route of ['/', '/scene.html', '/api/state', '/api/obs-link', '/assets/head.png']) {
    assert.equal((await fetch(base + route)).status, 401, route);
  }
  const bad = url.replace(/\/view\/[^/]+\//, '/view/' + 'A'.repeat(43) + '/');
  assert.equal((await fetch(bad)).status, 401);
  assert.equal((await fetch(base + '/view/short/scene.html')).status, 401);
});
test('replacing the link immediately revokes the old scene and live state', async t => {
  const { base, admin, mutation } = await start(t);
  const before = await link(base, admin);
  const csrf = await fetch(base + '/api/obs-link', { method: 'POST', headers: admin });
  assert.equal(csrf.status, 403);
  const response = await fetch(base + '/api/obs-link', { method: 'POST', headers: mutation, body: '{}' });
  assert.equal(response.status, 200);
  const after = (await response.json()).url;
  assert.notEqual(after, before);
  assert.equal((await fetch(before)).status, 401);
  assert.equal((await fetch(new URL('api/state', before))).status, 401);
  assert.equal((await fetch(after)).status, 200);
  assert.equal(await link(base, admin), after);
});
test('the OBS link survives service restart and failed replacement keeps the current link valid', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ankuzo-link-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const accessFile = path.join(dir, 'access.json');
  const first = await start(t, { accessFile });
  const before = new URL(await link(first.base, first.admin)).pathname;
  const second = await start(t, { accessFile });
  const after = new URL(await link(second.base, second.admin)).pathname;
  assert.equal(before, after);
  assert.equal(fs.statSync(accessFile).mode & 0o777, 0o600);
  const readOnlyFile = path.join(dir, 'cannot-save', 'access.json');
  // An existing file can be read, but its directory becomes unavailable before rotation.
  fs.mkdirSync(path.dirname(readOnlyFile));
  fs.copyFileSync(accessFile, readOnlyFile);
  const third = await start(t, { accessFile: readOnlyFile });
  fs.rmSync(path.dirname(readOnlyFile), { recursive: true });
  const response = await fetch(third.base + '/api/obs-link', { method: 'POST', headers: third.mutation, body: '{}' });
  assert.equal(response.status, 500);
  assert.equal(new URL(await link(third.base, third.admin)).pathname, before);
  assert.equal((await fetch(third.base + before)).status, 200);
});
