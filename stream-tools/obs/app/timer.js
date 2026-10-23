(function (scope) {
  'use strict';
  const defaults = Object.freeze({
    title: 'Скоро начнём', timerLabel: 'До начала эфира', finishedText: 'Начинаем',
    minutes: 5, showTimer: false, motion: true, quality: 'full',
  });
  const breakDefaults = Object.freeze({ ...defaults, title: 'Перерыв', subtitle: 'Скоро вернусь', timerLabel: 'До возвращения', finishedText: 'Возвращаюсь' });
  const overlayDefaults = Object.freeze({ ...defaults, title: 'Ankuzo', subtitle: 'ankuzo.online', position: 'bottom-left', size: 'standard', marginX: 40, marginY: 36, opacity: 100, overlayVisible: true, showCards: true, showSubtitle: true, showBackground: false, appearanceMode: 'always', intervalSeconds: 300, visibleSeconds: 15 });
  const mapcoverDefaults = Object.freeze({...defaults,title:'Ankuzo',shape:'square',width:360,height:360,x:0,y:0,coverVisible:true,chatEnabled:true,chatDuration:15,chatLines:2});
  function normalizeSettings(value = {}, scene = 'starting') {
    if(scene==='mapcover'){
      if(!value||typeof value!=='object')value={};
      const bound=(key,low,high)=>Number.isFinite(Number(value[key]))?Math.round(Math.max(low,Math.min(high,Number(value[key])))):mapcoverDefaults[key];
      const shape=['square','circle','rectangle'].includes(value.shape)?value.shape:'square';
      const width=bound('width',120,800),height=shape==='rectangle'?bound('height',120,800):width;
      return {...defaults,title:typeof value.title==='string'?value.title.trim().slice(0,24)||'Ankuzo':'Ankuzo',shape,width,height,x:bound('x',0,1920-width),y:bound('y',0,1080-height),coverVisible:typeof value.coverVisible==='boolean'?value.coverVisible:true,chatEnabled:typeof value.chatEnabled==='boolean'?value.chatEnabled:true,chatDuration:bound('chatDuration',5,60),chatLines:value.chatLines===1?1:2,motion:typeof value.motion==='boolean'?value.motion:true,quality:value.quality==='light'?'light':'full',showTimer:false};
    }
    const fallback = scene === 'overlay' ? overlayDefaults : scene === 'break' ? breakDefaults : defaults;
    if (!value || typeof value !== 'object') value = {};
    const text = (key, limit = 80) => typeof value[key] === 'string'
      ? value[key].trim().slice(0, limit) : (fallback[key] || '');
    const number = Number(value.minutes);
    const result = {
      title: text('title', scene === 'overlay' ? 24 : 80) || fallback.title,
      subtitle: text('subtitle', scene === 'overlay' ? 60 : 80),
      timerLabel: text('timerLabel') || fallback.timerLabel,
      finishedText: text('finishedText') || fallback.finishedText,
      game: text('game'),
      minutes: Number.isFinite(number) ? Math.min(120, Math.max(1, number)) : defaults.minutes,
      showTimer: typeof value.showTimer === 'boolean' ? value.showTimer : defaults.showTimer,
      motion: typeof value.motion === 'boolean' ? value.motion : defaults.motion,
      quality: value.quality === 'light' ? 'light' : 'full',
    };
    if (scene === 'overlay') {
      const bounded = (key, low, high) => Number.isFinite(Number(value[key])) ? Math.round(Math.max(low, Math.min(high, Number(value[key])))) : fallback[key];
      Object.assign(result, {
        showTimer: false,
        position: ['bottom-left', 'bottom-center', 'bottom-right', 'top-left', 'top-right'].includes(value.position) ? value.position : fallback.position,
        size: ['small', 'standard', 'large'].includes(value.size) ? value.size : fallback.size,
        marginX: bounded('marginX', 0, 300), marginY: bounded('marginY', 0, 250), opacity: bounded('opacity', 40, 100),
        overlayVisible: typeof value.overlayVisible === 'boolean' ? value.overlayVisible : true,
        showCards: typeof value.showCards === 'boolean' ? value.showCards : true,
        showSubtitle: typeof value.showSubtitle === 'boolean' ? value.showSubtitle : true,
        showBackground: typeof value.showBackground === 'boolean' ? value.showBackground : false,
        appearanceMode: value.appearanceMode === 'periodic' ? 'periodic' : 'always',
        intervalSeconds: bounded('intervalSeconds', 30, 3600),
      });
      result.visibleSeconds = Math.min(bounded('visibleSeconds', 3, 120), result.intervalSeconds - 1);
    }
    return result;
  }
  function formatTime(seconds) {
    const value = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }
  class Countdown {
    constructor(seconds, now = Date.now) {
      this.now = now;
      this.reset(seconds);
    }
    get milliseconds() { return this.paused ? this.remaining : Math.max(0, this.deadline - this.now()); }
    get seconds() { return Math.ceil(this.milliseconds / 1000); }
    get finished() { return this.seconds === 0; }
    start() {
      if (!this.paused || this.finished) return;
      this.deadline = this.now() + this.remaining;
      this.paused = false;
    }
    toggle() {
      if (this.paused) this.start();
      else { this.remaining = this.milliseconds; this.paused = true; }
    }
    reset(seconds) {
      this.remaining = Math.max(0, Number(seconds) || 0) * 1000;
      this.paused = true;
      this.deadline = 0;
    }
    add(seconds) {
      this.remaining = Math.max(0, this.milliseconds + seconds * 1000);
      if (!this.paused) this.deadline = this.now() + this.remaining;
    }
  }
  const api = { Countdown, formatTime, normalizeSettings, defaults, breakDefaults, overlayDefaults, mapcoverDefaults };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.AnkuzoTimer = api;
})(typeof window !== 'undefined' ? window : globalThis);
