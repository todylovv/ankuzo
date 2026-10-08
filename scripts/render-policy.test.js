import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBudget, nextRenderScale, frameDue } from '../src/art/renderPolicy.js';

test('retina and large displays have bounded work without removing any effects',()=>{
  for(const [w,h,dpr] of [[390,844,3],[1440,900,1.25],[3840,2160,2]]){
    const b=renderBudget(w,h,dpr,1);
    assert.ok(b.width*b.height<=2200000+10000);
    assert.ok(b.auraWidth*b.auraHeight<=450000+2000);
    assert.ok(b.auraWidth>=1 && b.auraHeight>=1);
  }
});
test('internal resolution responds to sustained load rather than one dropped frame',()=>{
  assert.equal(nextRenderScale(1,[...Array(89).fill(16.7),100]),1);
  assert.ok(nextRenderScale(1,Array(90).fill(35))<1);
  assert.equal(nextRenderScale(.55,Array(90).fill(100)),.55);
  assert.equal(nextRenderScale(.8,Array(90).fill(16.7)),.8);
});
test('background work is capped independently of a high-refresh display and resume renders immediately',()=>{
  assert.equal(frameDue(100,0,30),true);
  assert.equal(frameDue(108,100,30),false);
  assert.equal(frameDue(134,100,30),true);
  assert.equal(frameDue(117,100,60),true);
});
