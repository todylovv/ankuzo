import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../src/art/renderPolicy.js';
test('smoke has a separate raster budget for smooth full and lightweight motion',()=>{
 assert.equal(typeof policy.smokeBudget,'function');
 for(const [w,h] of [[390,844],[1440,900],[3840,2160],[1,1]]){
  for(const light of [false,true]){
   const b=policy.smokeBudget(w,h,1,light);
   assert.ok(b.width>=1&&b.height>=1);
   assert.ok(b.width*b.height<=(light?120000:220000));
   assert.ok(b.width<=w&&b.height<=h);
  }
 }
 const normal=policy.smokeBudget(1440,900,1),reduced=policy.smokeBudget(1440,900,.55);
 assert.ok(reduced.width*reduced.height<normal.width*normal.height);
});
