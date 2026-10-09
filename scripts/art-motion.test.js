import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, advancePhase, CHAPTER_SPAN } from '../src/art/motionFacts.js';
test('a former full chapter scroll now leaves time to see the transition',()=>{
  assert.ok(phaseAt(2050,1000)<.65);
  assert.equal(phaseAt(CHAPTER_SPAN*1000,1000),1);
  assert.equal(phaseAt(-100,1000),0);
  assert.equal(phaseAt(99999,1000),4);
});
test('a fast fling cannot skip the card animation in one frame',()=>{
  assert.ok(advancePhase(0,3,16)<=.7*.016+.00001);
  assert.ok(advancePhase(3,0,16)>=3-.7*.016-.00001);
});
test('motion remains independent of frame rate and settles in both directions',()=>{
  const simulate=(dt,target)=>{let g=0;for(let t=0;t<1800;t+=dt)g=advancePhase(g,target,dt);return g;};
  assert.ok(Math.abs(simulate(15,1)-simulate(7.5,1))<.015);
  assert.equal(advancePhase(1,1,16),1);
  assert.ok(advancePhase(2,1,16)<2);
});
