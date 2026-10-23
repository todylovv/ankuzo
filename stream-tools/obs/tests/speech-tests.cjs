'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSpeech, profanityWords, normalizeRecognition } = require('../app/speech.cjs');
const { createServer } = require('../app/server.cjs');

test('Russian word matching handles derivatives, repetitions and harmless substrings', () => {
  assert.deepEqual(profanityWords('Блядь, блять, пиздец, заебал, нахуй, ёбаный!'), ['блядь','блять','пиздец','заебал','нахуй','ебаный']);
  assert.deepEqual(profanityWords('страхуй подстрахуй хулиган рубля корабля учеба хлеб Елена'), []);
  assert.deepEqual(profanityWords('блядь блядь'), ['блядь', 'блядь']);
});

test('reported Russian ASR confusions and missing o-prefix forms count without substring rewrites', () => {
  assert.equal(normalizeRecognition('Пидец! ОХЛИТЕЛЬНО, ахуительно.'),'Пиздец! ОХУИТЕЛЬНО, охуительно.');
  assert.deepEqual(profanityWords('охуительно охуеть охуенный ахуительно охлительно пидец съебать подъебать'),['охуительно','охуеть','охуенный','охуительно','охуительно','пиздец','съебать','подъебать']);
  assert.deepEqual(profanityWords('писец хулиган подстрахуй рубля корабля охладительно восхитительно дизайн веб вебка веб-камера вебсайт'),[]);
  assert.equal(normalizeRecognition('пидеца пидецкий писец'), 'пидеца пидецкий писец');
});

async function fixture(t, options = {}) {
  let clock = 100000, response = { text: 'блядь пиздец', words: [{word:'блядь',start:0,end:0.4,probability:0.9},{word:'пиздец',start:0.5,end:0.9,probability:0.9}], processingMs:200 };
  let calls = 0;
  const engine = createSpeech({ now: () => clock, transcribe: async () => { calls++; return response; }, ...options });
  const server = http.createServer(async (req, res) => {
    await engine.handle(req, res, { pathname: new URL(req.url, 'http://test').pathname, viewer: false, admin: true, controlKey:'test', origin: base, json: (res,status,value) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(value)); } });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => server.close(resolve)));
  let session;
  const post = async (route, body = {}, extra = {}) => fetch(base + '/api/speech/' + route, { method:'POST', headers: {'Content-Type':'application/json','X-Ankuzo-Control':'1', Origin:base, ...(session ? {'X-Ankuzo-Speech-Session':session}:{}), ...extra},body:JSON.stringify(body)});
  const start = async () => { const result = await post('start'); assert.equal(result.status,200); session = (await result.json()).session; };
  const audio = async (seq=0,offset=0) => fetch(base+'/api/speech/audio',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Ankuzo-Control':'1',Origin:base,'X-Ankuzo-Speech-Session':session,'X-Audio-Sequence':String(seq),'X-Audio-Start':String(offset)},body:Buffer.alloc(32000)});
  return { engine, post, start, audio, calls:()=>calls, tick:ms=>{clock+=ms;}, result:value=>{response=value;} };
}

test('audio retries and overlapping timestamps are counted only once', async t => {
  const f = await fixture(t); await f.start();
  assert.equal((await f.audio()).status,200); assert.equal(f.engine.snapshot().count,2);
  await f.audio(); assert.equal(f.engine.snapshot().count,2); assert.equal(f.calls(),1);
  await f.audio(1,0); assert.equal(f.engine.snapshot().count,2);
  f.result({text:'пиздец',words:[{word:'пиздец',start:.52,end:1.05,probability:.9}]});
  await f.audio(2,0); assert.equal(f.engine.snapshot().count,2,'Overlapping words with ASR timing jitter are deduplicated');
  f.result({text:'блядь пиздец',words:[{word:'блядь',start:0,end:.4,probability:.9},{word:'пиздец',start:.5,end:.9,probability:.9}]});
  f.tick(2000); await f.audio(3,1200); assert.equal(f.engine.snapshot().count,4);
});

test('threshold triggers a bounded reaction; cooldown and expiry work', async t => {
  const f = await fixture(t); await f.post('rules',{threshold:2,windowSeconds:15,cooldownSeconds:30,durationSeconds:5}); await f.start();
  await f.audio(); const trigger=f.engine.overlay().trigger; assert.ok(trigger);
  f.tick(2000); await f.audio(1,1200); assert.equal(f.engine.overlay().trigger.id,trigger.id);
  f.tick(4000); assert.equal(f.engine.overlay().trigger,null);
  f.tick(20000); await f.post('heartbeat'); f.tick(10000); await f.audio(2,36000); assert.ok(f.engine.overlay().trigger);
});

test('a longer recognition delay does not erase a short captured frequency window', async t => {
  const f=await fixture(t); await f.post('rules',{threshold:2,windowSeconds:5}); await f.start();
  f.tick(12000); await f.audio(); assert.ok(f.engine.overlay().trigger);
  assert.equal(f.engine.snapshot().count,2);
});

test('reported mistakes are corrected in both the counter and the visible transcript', async t => {
  const f=await fixture(t); await f.start();
  f.result({text:'Пидец! Охлительно!',words:[{word:'Пидец!',start:0,end:.4,probability:.8},{word:'Охлительно!',start:.5,end:.9,probability:.8}],processingMs:4000});
  await f.audio(); const state=f.engine.snapshot();
  assert.equal(state.count,2); assert.equal(state.lastText,'Пиздец! Охуительно!');
  assert.deepEqual(state.events[0].words,['пиздец','охуительно']);
  assert.deepEqual(state.lastMetrics.corrections,[{heard:'пидец',corrected:'пиздец'},{heard:'охлительно',corrected:'охуительно'}]);
});

test('expired leases, a second producer and reset during recording are rejected', async t => {
  const f=await fixture(t); await f.start();
  assert.equal((await f.post('start')).status,409);
  assert.equal((await f.post('reset')).status,409);
  f.tick(31000); assert.equal((await f.audio()).status,409);
  await f.start(); assert.equal((await f.post('stop')).status,200); assert.equal((await f.post('reset')).status,200);
});

test('origin, request format, bounds and low confidence are checked', async t => {
  const f=await fixture(t);
  assert.equal((await f.post('start',{}, {Origin:'https://example.com'})).status,403);
  assert.equal((await f.post('rules',{threshold:0})).status,400);
  await f.start();
  f.result({text:'блядь',words:[{word:'блядь',start:0,end:.5,probability:.1}]});
  await f.audio(); assert.equal(f.engine.snapshot().count,0);
});

test('only count, switches and bounded reaction are exposed to OBS viewers', async t => {
  const server=createServer({persist:false,controlKey:'test',edgeAuth:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const link=await (await fetch(base+'/api/obs-link?scene=rage',{headers:{Authorization:'Bearer test'}})).json();
  assert.equal((await fetch(link.url)).status,200);
  const snapshot=await (await fetch(new URL('api/speech-overlay',link.url))).json();
  assert.deepEqual(Object.keys(snapshot).sort(),['count','serverNow','showCounter','trigger']);
  for (const route of ['api/speech/state','speech-control.js','mic-worklet.js','api/speech/start']) assert.equal((await fetch(new URL(route,link.url))).status,403);
  assert.equal((await fetch(base+'/api/speech/state')).status,401);
  assert.match((await fetch(base+'/',{headers:{Authorization:'Bearer test'}})).headers.get('permissions-policy'),/microphone=\(self\)/);
  assert.match((await fetch(link.url)).headers.get('permissions-policy'),/microphone=\(\)/);
});

test('only matches are persisted and reset survives restart', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ankuzo-speech-')); const file=path.join(dir,'state.json');
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const f=await fixture(t,{file}); await f.start(); await f.audio();
  const saved=JSON.parse(fs.readFileSync(file)); assert.equal(saved.count,2); assert.equal('lastText' in saved,false); assert.equal('session' in saved,false);
  const restarted=createSpeech({file}); assert.equal(restarted.snapshot().count,2); assert.equal(restarted.snapshot().active,false);
  await f.post('stop'); await f.post('reset'); assert.equal(createSpeech({file}).snapshot().count,0);
});
