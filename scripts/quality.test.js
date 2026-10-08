import test from 'node:test';
import assert from 'node:assert/strict';
import { initialQuality, frameQuality, parsePreference } from '../src/art/qualityPolicy.js';

test('reduced motion and genuinely weak devices start without animation', () => {
  assert.equal(initialQuality({ reduced: true, cores: 16, memory: 16 }), 'off');
  assert.equal(initialQuality({ cores: 2, memory: 2 }), 'off');
});
test('unknown and modest devices start with lightweight motion', () => {
  assert.equal(initialQuality({}), 'motion');
  assert.equal(initialQuality({ cores: 4, memory: 4, mobile: true }), 'motion');
});
test('capable devices can start full, including capable phones', () => {
  assert.equal(initialQuality({ cores: 8, memory: 8 }), 'full');
  assert.equal(initialQuality({ cores: 8, mobile: true }), 'full');
});
test('preferences are validated, not trusted from storage', () => {
  for (const value of ['off','motion','full','auto']) assert.equal(parsePreference(value), value);
  for (const value of [null,'ultra','',{},false]) assert.equal(parsePreference(value),'auto');
});
test('sustained slow rendering downgrades a level, smooth frames do not', () => {
  assert.equal(frameQuality('full', Array(120).fill(16.7)), 'full');
  assert.equal(frameQuality('full', Array(120).fill(34)), 'motion');
  assert.equal(frameQuality('motion', Array(120).fill(55)), 'off');
  assert.equal(frameQuality('off', Array(120).fill(55)), 'off');
});
test('isolated stalls, small windows and invalid samples cannot downgrade', () => {
  assert.equal(frameQuality('full', [...Array(118).fill(16.7), 300, 400]), 'full');
  assert.equal(frameQuality('full', Array(20).fill(100)), 'full');
  assert.equal(frameQuality('full', Array(120).fill(NaN)), 'full');
});
