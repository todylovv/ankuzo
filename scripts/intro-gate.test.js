import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForIntro } from '../src/art/introGate.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('intro stays visible until every critical resource settles',async()=>{
  let resolveLast,finished=false;
  const last=new Promise(resolve=>{resolveLast=resolve;});
  const ready=waitForIntro([Promise.resolve(),last],{minMs:0,timeoutMs:200}).then(()=>{finished=true;});
  await delay(10);assert.equal(finished,false);resolveLast();await ready;assert.equal(finished,true);
});
test('fast cached loads still allow the brief intro to be seen',async()=>{
  const start=performance.now();await waitForIntro([Promise.resolve()],{minMs:30,timeoutMs:100});
  assert.ok(performance.now()-start>=25);
});
test('a failed image counts as settled and cannot trap visitors',async()=>{
  const events=[];const result=await waitForIntro([Promise.reject(new Error('image unavailable')),Promise.resolve()],{minMs:0,timeoutMs:100,onProgress:(done,total)=>events.push([done,total])});
  assert.equal(result.timedOut,false);assert.deepEqual(events,[[1,2],[2,2]]);
});
test('a stalled third party cannot keep the page covered forever',async()=>{
  const result=await waitForIntro([new Promise(()=>{})],{minMs:0,timeoutMs:15});
  assert.equal(result.timedOut,true);
});
test('skipping aborts the wait and cancels minimum display time',async()=>{
  const controller=new AbortController();const start=performance.now();
  const ready=waitForIntro([new Promise(()=>{})],{minMs:200,timeoutMs:300,signal:controller.signal});
  controller.abort();assert.equal((await ready).aborted,true);assert.ok(performance.now()-start<100);
});
