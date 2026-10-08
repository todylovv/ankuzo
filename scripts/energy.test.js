import test from 'node:test';
import assert from 'node:assert/strict';
import { energyFrame } from '../src/art/energyFacts.js';
const person={x:700,y:50,width:530,height:800};
const deck={x:440,y:200,width:220,height:340};
const moving={x:800,y:150,width:320,height:480};
test('energy remains present through all four chapters',()=>{
  for(let g=0;g<=3;g+=.01) assert.ok(energyFrame(g,person,deck,moving).strength>.5);
});
test('the character hands energy to the deck and then the travelling card',()=>{
  assert.deepEqual(energyFrame(0,person,deck,moving).rect,person);
  assert.deepEqual(energyFrame(1,person,deck,moving).rect,deck);
  assert.deepEqual(energyFrame(2,person,deck,moving).rect,moving);
  assert.deepEqual(energyFrame(3,person,deck,moving).rect,moving);
});
test('handoff boundaries are continuous in both scroll directions',()=>{
  for(const g of [.22,.94,1.08,1.4]){
    const before=energyFrame(g-.00001,person,deck,moving),after=energyFrame(g+.00001,person,deck,moving);
    for(const key of ['x','y','width','height']) assert.ok(Math.abs(before.rect[key]-after.rect[key])<.01);
    assert.ok(Math.abs(before.strength-after.strength)<.01);
  }
});
test('a zero-width card during a flip cannot create invalid shader coordinates',()=>{
  const result=energyFrame(2,person,deck,{x:180,y:30,width:0,height:0});
  assert.equal(result.rect.width,1);assert.equal(result.rect.height,1);
});
