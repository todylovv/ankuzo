import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../src/art/renderPolicy.js';
test('decorative card fading preserves the print brightness through every scroll chapter',()=>{
 assert.equal(typeof policy.decorativeCardAppearance,'function');
 const initial=policy.decorativeCardAppearance(0,.8);
 for(const phase of [0,.5,1,1.6,2,2.5,3,4]){
  const style=policy.decorativeCardAppearance(phase,.8);
  assert.ok(style.brightness>=.85,'Print must not turn into a black silhouette');
  assert.ok(style.opacity>0&&style.opacity<=initial.opacity,'Quiet cards fade by transparency');
  assert.equal(style.brightness,initial.brightness);
 }
 assert.ok(policy.decorativeCardAppearance(3,.8).opacity<initial.opacity);
 for(let phase=0;phase<4;phase+=.01)assert.ok(Math.abs(policy.decorativeCardAppearance(phase,.8).opacity-policy.decorativeCardAppearance(phase+.01,.8).opacity)<.02);
});
