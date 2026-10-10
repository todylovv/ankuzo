import test from 'node:test';
import assert from 'node:assert/strict';
import { deckCardPose, travellerPose } from '../src/art/motionFacts.js';
import { connectThread, fibreOffset } from '../src/art/silkGeometry.js';

test('every handoff frame shares the same card position, dimensions and orientation',()=>{
  for(const [w,h] of [[1920,1080],[1280,720],[820,1180],[390,844],[375,667]]){
    for(let frame=0;frame<=132;frame++){
      const phase=frame/100;
      assert.deepEqual(travellerPose(phase,w,h),deckCardPose(phase,w,h,1));
    }
  }
});

test('thread handles meet the real edge with the wrap tangent, even at an almost edge-on flip',()=>{
  for(let frame=0;frame<=360;frame++){
    const angle=frame*Math.PI/180,out=[Math.cos(angle),Math.sin(angle)];
    for(const gap of [.001,1,20,600]){
      const a=[400,300],b=[400+gap,310];
      const nodes=connectThread(a,b,out,out.map(v=>-v));
      assert.deepEqual(nodes[0],a);assert.deepEqual(nodes[3],b);
      const tangent=nodes[1].map((v,k)=>v-a[k]);
      assert.ok(Math.abs(tangent[0]*out[1]-tangent[1]*out[0])<1e-8);
      nodes.flat().forEach(v=>assert.ok(Number.isFinite(v)));
    }
  }
});

test('all transition frames remain continuous and deterministic in both directions',()=>{
  for(const [w,h] of [[1440,900],[390,844],[375,667]]){
    const forward=Array.from({length:2401},(_,i)=>travellerPose(i/600,w,h));
    for(let i=2400;i>0;i--){
      assert.deepEqual(travellerPose(i/600,w,h),forward[i]);
      const a=forward[i-1],b=forward[i];
      assert.ok(Math.hypot((a.x-b.x)*w,(a.y-b.y)*h)<8);
      assert.ok(Math.abs(a.width*a.scale-b.width*b.scale)<4);
      assert.ok(Math.abs(a.flip-b.flip)<1);
    }
  }
});

test('energy fibres converge exactly at both tied endpoints',()=>{
  for(let time=0;time<20;time+=.1)for(const side of [-1,1]){
    assert.equal(Math.abs(fibreOffset(0,200,time,side)),0);
    assert.equal(Math.abs(fibreOffset(200,200,time,side)),0);
    assert.ok(Math.abs(fibreOffset(100,200,time,side))<=4);
  }
});
