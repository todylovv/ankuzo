import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCell, assemble } from '../src/art/introPortraitFacts.js';
const cell=(r,g,b,a=255)=>new Uint8ClampedArray(Array.from({length:8},()=>[r,g,b,a]).flat());
test('ASCII respects the transparent silhouette and black eye openings',()=>{
  assert.equal(encodeCell(cell(255,255,255,0),2,0,0).code,0);
  assert.equal(encodeCell(cell(0,0,0),2,0,0).code,0);
  assert.equal(encodeCell(cell(255,255,255),2,0,0).code,255);
});
test('the eight braille dots retain their correct spatial mapping',()=>{
  const expected=[1,8,2,16,4,32,64,128];
  expected.forEach((dot,i)=>{const data=cell(0,0,0);data.set([255,255,255,255],i*4);assert.equal(encodeCell(data,2,0,0).code,dot);});
});
test('hair and the pale mask form separate layers from the same portrait',()=>{
  assert.equal(encodeCell(cell(215,36,72),2,0,0).hair,true);
  assert.equal(encodeCell(cell(215,207,210),2,0,0).hair,false);
});
test('all symbols settle and stay settled while a resource is still loading',()=>{
  for(let row=0;row<64;row++)for(let seed=0;seed<=1;seed+=.1){
    assert.equal(assemble(0,row,seed),0);
    assert.equal(assemble(3,row,seed),1);
    assert.equal(assemble(12,row,seed),1);
    assert.ok(assemble(1.5,row,seed)>=assemble(1,row,seed));
  }
});

import { mountIntroScene } from '../src/art/introScene.js';
test('a browser without Canvas can exit and dispose the portrait scene',async()=>{
  const previous=global.document;
  try{
    for(const failAt of [1,2]){
      let contexts=0;
      global.document={createElement:()=>({setAttribute(){},remove(){},getContext(){return ++contexts===failAt?null:{};}})};
      const scene=mountIntroScene({querySelector:()=>({append(){}})});
      await scene.ready;
      assert.doesNotThrow(()=>scene.exit());
      assert.doesNotThrow(()=>scene.dispose());
    }
  }finally{if(previous===undefined)delete global.document;else global.document=previous;}
});
