import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, CHAPTER_SPAN } from '../src/art/motionFacts.js';

test('PlayStation adds a full stop before About and the route reaches chapter five',()=>{
  assert.equal(phaseAt(CHAPTER_SPAN*1000*3,1000),3);
  assert.equal(phaseAt(CHAPTER_SPAN*1000*4,1000),4);
  assert.equal(phaseAt(999999,1000),4);
});

test('PSN groups PS4 and PS5 without losing their distinct trophy progress',async()=>{
  const { buildPsnSnapshot } = await import('../src/art/psnFacts.js');
  const result=buildPsnSnapshot({psnId:'ankkui',status:'unavailable',updatedAt:'2026-07-17',trophies:{platinum:0,total:1},library:[
    {title:'ELDEN RING™',platform:'PS4',trophyProgress:0,trophyMatched:true,iconUrl:'https://example.com/a'},
    {title:'ELDEN RING',platform:'PS5',trophyProgress:4,trophyMatched:true},
    {title:'ELDEN RING',platform:'PS5',trophyProgress:null,trophyMatched:false},
    {title:'Other',platform:'PS5',trophyProgress:null,trophyMatched:false},
  ]});
  assert.equal(result.games.length,2);
  const game=result.games.find(g=>g.title.includes('ELDEN'));
  assert.deepEqual(game.versions.map(v=>v.platform),['PS5','PS4']);
  assert.equal(game.versions[0].progress,4);
  assert.equal(game.versions[1].progress,0);
  assert.equal(result.games.find(g=>g.title==='Other').versions[0].progress,null);
  assert.equal(result.trophies.platinum,0);
  assert.equal(result.trophies.gold,null);
  assert.equal(result.state,'saved');
});

test('catalog filtering searches accents/punctuation and respects platform versions',async()=>{
  const { buildPsnSnapshot, filterPsnGames } = await import('../src/art/psnFacts.js');
  const {games}=buildPsnSnapshot({library:[{title:'God of War Ragnarök',platform:'PS5',trophyProgress:4},{title:'Only four',platform:'PS4'}]});
  assert.equal(filterPsnGames(games,'ragnarok','PS5').length,1);
  assert.equal(filterPsnGames(games,'ragnarok','PS4').length,0);
  assert.equal(filterPsnGames(games,'missing','all').length,0);
});

test('missing or malformed snapshots never fabricate numbers or library entries',async()=>{
  const { buildPsnSnapshot } = await import('../src/art/psnFacts.js');
  const result=buildPsnSnapshot({trophies:{gold:'8',total:-2},library:[null,{}, {title:'Bad platform',platform:'PC'}]});
  assert.equal(result.games.length,0);
  assert.equal(result.trophies.gold,null);
  assert.equal(result.trophies.total,null);
});

test('the travelling card has continuous reversible poses and preserves the existing About ending',async()=>{
  const { travellerPose } = await import('../src/art/motionFacts.js');
  for(const [w,h] of [[1440,900],[390,844]]){
    const play=travellerPose(3,w,h),about=travellerPose(4,w,h);
    if(w<=760){
      assert.ok(play.x<.25,'card stays beside the console');
      assert.ok(play.y*h-play.width*.75*play.scale>h*.30,'card clears the library button');
    }else assert.ok(play.y<.4,'card sits above the console');
    assert.equal(play.flip,180);
    assert.ok(about.x<(w<=760?.9:.4));
    assert.equal(about.flip,180);
    for(let g=2;g<4;g+=.01){
      const a=travellerPose(g,w,h),b=travellerPose(g+.001,w,h);
      assert.ok(Math.abs(a.x-b.x)<.005);
      assert.ok(Math.abs(a.y-b.y)<.005);
      assert.ok(Math.abs(a.width-b.width)<5);
      for(const value of Object.values(a)) assert.ok(Number.isFinite(value));
      assert.deepEqual(travellerPose(g,w,h),a,'pose is independent of scroll direction');
    }
  }
});
