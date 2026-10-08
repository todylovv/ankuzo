import test from 'node:test';
import assert from 'node:assert/strict';
import { energyFrame } from '../src/art/energyFacts.js';
const person={x:700,y:50,width:530,height:800};
const viewport={width:1440,height:900};
test('the aura begins attached to the character',()=>{
  const frame=energyFrame(0,person,viewport);
  assert.deepEqual(frame.rect,person);assert.equal(frame.attached,1);assert.equal(frame.spread,0);assert.equal(frame.diffuse,0);
});
test('scrolling detaches the aura and spreads it across the viewport instead of shrinking to a card',()=>{
  const mid=energyFrame(.45,person,viewport),end=energyFrame(1,person,viewport);
  assert.ok(mid.spread>.3&&mid.diffuse>.3&&mid.attached<.5);
  assert.equal(end.attached,0);assert.equal(end.spread,1);
  assert.ok(end.rect.x<0&&end.rect.y<0&&end.rect.width>viewport.width&&end.rect.height>viewport.height);
});
test('the dispersed energy fades gradually through later chapters',()=>{
  assert.ok(energyFrame(.8,person,viewport).diffuse>energyFrame(1.8,person,viewport).diffuse);
  assert.ok(energyFrame(1.8,person,viewport).diffuse>energyFrame(3,person,viewport).diffuse);
  for(let g=0;g<=3;g+=.01){
    const a=energyFrame(g,person,viewport),b=energyFrame(g+.00001,person,viewport);
    for(const key of ['attached','spread','diffuse'])assert.ok(Math.abs(a[key]-b[key])<.001);
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(a.rect[key]-b.rect[key])<.1);
  }
});
test('reverse scrolling retraces the same continuous dispersion',()=>{
  const forward=Array.from({length:31},(_,i)=>energyFrame(i/10,person,viewport));
  const reverse=Array.from({length:31},(_,i)=>energyFrame((30-i)/10,person,viewport)).reverse();
  assert.deepEqual(forward,reverse);
});
test('portrait and landscape viewports are covered and zero-size bounds stay finite',()=>{
  for(const view of [{width:390,height:844},viewport,{width:844,height:390}]){
    const frame=energyFrame(1,{x:0,y:0,width:0,height:0},view);
    assert.ok(frame.rect.width>=view.width&&frame.rect.height>=view.height);
    assert.ok(Object.values(frame.rect).every(Number.isFinite));
  }
});
