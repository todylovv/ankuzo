import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, advancePhase, CHAPTER_SPAN } from '../src/art/motionFacts.js';
import * as motion from '../src/art/motionFacts.js';

test('short portrait FACEIT card clears the text column and footer',()=>{
  const p=motion.travellerPose(2,320,568),a=Math.abs(p.rotate)*Math.PI/180;
  const halfW=p.width*p.scale*(Math.cos(a)+1.5*Math.sin(a))/2;
  const halfH=p.width*p.scale*(Math.sin(a)+1.5*Math.cos(a))/2;
  assert.ok(p.x*320-halfW>160);
  assert.ok(p.y*568+halfH<500);
});

test('landscape deck leaves the text column and bottom controls clear',()=>{
  for(let i=0;i<5;i++){
    const p=motion.deckCardPose(1,926,428,i),a=Math.abs(p.rotate)*Math.PI/180;
    const halfW=(p.width*Math.cos(a)+p.width*1.5*Math.sin(a))/2;
    const halfH=(p.width*Math.sin(a)+p.width*1.5*Math.cos(a))/2;
    assert.ok(p.x*926-halfW>430);
    assert.ok(p.y*428-halfH>85);
    assert.ok(p.y*428+halfH<312);
  }
});

test('a final section that already fits never scrolls its heading off screen',()=>{
  assert.equal(typeof motion.aboutScrollRange,'function');
  assert.equal(motion.aboutScrollRange(157,699,926),0);
});
test('a long final section scrolls only enough to reveal its bottom and reverses',()=>{
  assert.equal(typeof motion.aboutScrollOffset,'function');
  assert.equal(motion.aboutScrollRange(102,750,568),284);
  assert.equal(motion.aboutScrollOffset(8179.2,568,284),0);
  assert.ok(Math.abs(motion.aboutScrollOffset(8279.2,568,284)-100)<.001);
  assert.equal(motion.aboutScrollOffset(99999,568,284),284);
  assert.equal(motion.aboutScrollOffset(8000,568,284),0);
});
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
