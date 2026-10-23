const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../app/server.cjs');
test('public viewers cannot operate the remotely hosted countdown', async t => {
  const server = createServer({ persist: false, controlKey: 'a-test-only-key-with-no-real-access' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1', Origin: base };
  const response = await fetch(base + '/api/control', { method: 'POST', headers, body: '{"action":"start"}' });
  assert.equal(response.status, 401);
  const state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.timer.running, false);
  assert.equal(Object.hasOwn(state, 'controlKey'), false);
  const allowed = await fetch(base + '/api/control', { method: 'POST', headers: { ...headers, Authorization: 'Bearer a-test-only-key-with-no-real-access' }, body: '{"action":"start"}' });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).timer.running, true);
});
