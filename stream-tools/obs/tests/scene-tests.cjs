const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const modulePath = path.join(__dirname, '../app/timer.js');
const core = fs.existsSync(modulePath) ? require(modulePath) : {};

test('countdown follows elapsed wall time, even when frames are skipped', () => {
  assert.equal(typeof core.Countdown, 'function', 'Countdown is not implemented');
  let time = 1000;
  const timer = new core.Countdown(300, () => time);
  timer.start();
  time = 62600;
  assert.equal(timer.seconds, 239);
  time = 500000;
  assert.equal(timer.seconds, 0);
  assert.equal(timer.finished, true);
});

test('pause freezes time; resume counts only the remaining duration', () => {
  assert.equal(typeof core.Countdown, 'function', 'Countdown is not implemented');
  let time = 0;
  const timer = new core.Countdown(300, () => time);
  timer.start();
  time = 10000;
  timer.toggle();
  time = 90000;
  assert.equal(timer.seconds, 290);
  timer.toggle();
  time = 95000;
  assert.equal(timer.seconds, 285);
  assert.equal(timer.paused, false);
});

test('extending a finished timer restarts it; reset restores configured duration', () => {
  assert.equal(typeof core.Countdown, 'function', 'Countdown is not implemented');
  let time = 0;
  const timer = new core.Countdown(60, () => time);
  timer.start();
  time = 61000;
  timer.add(60);
  assert.equal(timer.seconds, 60);
  assert.equal(timer.finished, false);
  time = 71000;
  timer.reset(180);
  assert.equal(timer.seconds, 180);
  assert.equal(timer.paused, true);
});

test('a new timer waits for the streamer to start it', () => {
  assert.equal(typeof core.Countdown, 'function', 'Countdown is not implemented');
  let time = 0;
  const timer = new core.Countdown(300, () => time);
  time = 90000;
  assert.equal(timer.seconds, 300);
  assert.equal(timer.paused, true);
  timer.start();
  time = 91000;
  assert.equal(timer.seconds, 299);
});

test('time formatting rounds upward and never shows negative or invalid values', () => {
  assert.equal(typeof core.formatTime, 'function', 'Formatter is not implemented');
  for (const [input, want] of [[300, '05:00'], [59.2, '01:00'], [0, '00:00'], [-4, '00:00'], [NaN, '00:00'], [7200, '120:00']]) {
    assert.equal(core.formatTime(input), want);
  }
});

test('invalid settings safely fall back; display text stays bounded', () => {
  assert.equal(typeof core.normalizeSettings, 'function', 'Settings validation is not implemented');
  const settings = core.normalizeSettings({ minutes: 'oops', title: '  test  ', game: 'x'.repeat(200), showTimer: false });
  assert.equal(settings.minutes, 5);
  assert.equal(settings.title, 'test');
  assert.equal(settings.game.length, 80);
  assert.equal(settings.showTimer, false);
  assert.equal(core.normalizeSettings({ minutes: -10 }).minutes, 1);
  assert.equal(core.normalizeSettings({ minutes: 999 }).minutes, 120);
});
