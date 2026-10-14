import test from 'node:test';
import assert from 'node:assert/strict';
import * as paint from '../src/art/silkGeometry.js';

test('continuous silk retains both ends and paints a long settled rope in three strokes',()=>{
  assert.equal(typeof paint.silkStrokeRuns,'function');
  const points=Array.from({length:181},(_,i)=>[i,Math.sin(i/10)]);
  const runs=paint.silkStrokeRuns(points,0);
  assert.equal(runs.length,1);
  assert.deepEqual(runs[0].points[0],[0,0]);
  assert.deepEqual(runs[0].points.at(-1),points.at(-1));
  assert.equal(runs[0].alpha,1);
});
test('a fading rope preserves the connected route while bounding paint work',()=>{
  assert.equal(typeof paint.silkStrokeRuns,'function');
  const points=Array.from({length:181},(_,i)=>[i,0]);
  const runs=paint.silkStrokeRuns(points,1);
  assert.ok(runs.length<=33);
  assert.ok(runs[0].alpha<.1);
  assert.equal(runs.at(-1).alpha,1);
  assert.deepEqual(runs[0].points[0],[0,0]);
  assert.deepEqual(runs.at(-1).points.at(-1),[180,0]);
  runs.slice(1).forEach((run,i)=>assert.deepEqual(run.points[0],runs[i].points.at(-1)));
});
