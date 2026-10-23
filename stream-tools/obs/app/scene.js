(() => {
  'use strict';
  const { normalizeSettings, formatTime } = window.AnkuzoTimer;
  const scene = document.body.dataset.scene === 'break' ? 'break' : 'starting';
  const apiBase = new URL('.', location.href);
  apiBase.username = ''; apiBase.password = '';
  const stage = document.getElementById('stage');
  const title = document.getElementById('scene-title');
  const block = document.getElementById('timer-block');
  const caption = document.getElementById('timer-caption');
  const display = document.getElementById('timer-display');
  const endText = document.getElementById('finished-text');
  const subtitle = document.getElementById('scene-subtitle');
  const copy = document.querySelector('.copy');
  let state = { settings: normalizeSettings({}, scene), timer: { remainingMs: 300000, running: false, finished: false }, revision: -1 };
  let timeOffset = 0;
  let appliedRevision = null;
  function fit() {
    stage.style.setProperty('--scene-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  window.addEventListener('resize', fit);
  fit();
  for (let i = 0; i < 12; i++) {
    const mote = document.createElement('i');
    mote.className = 'mote';
    mote.style.cssText = `--x:${35 + (i * 47 % 65)}%;--y:${20 + (i * 17 % 70)}%;--dur:${13 + i % 9}s;--delay:-${i * 3}s`;
    document.getElementById('motes').append(mote);
  }
  function setCopy(element, value, medium, long) {
    element.textContent = value;
    element.classList.toggle('long', value.length > medium);
    if (long) element.classList.toggle('very-long', value.length > long);
  }
  function fitCopy() {
    if (scene !== 'break') return;
    const shift = stage.classList.contains('timer-hidden') ? 100 : 0;
    const available = stage.clientHeight - copy.offsetTop - shift - 145;
    copy.style.setProperty('--copy-fit', Math.min(1, available / Math.max(1, copy.offsetHeight)));
  }
  document.fonts.ready.then(fitCopy);
  function apply(next) {
    const changed = next.revision !== appliedRevision;
    appliedRevision = next.revision;
    state = next;
    timeOffset = next.serverNow ? next.serverNow - Date.now() : 0;
    if (!changed) return;
    const config = normalizeSettings(next.settings, scene);
    setCopy(title, config.title, scene === 'break' ? 12 : 28, scene === 'break' ? 28 : 52);
    if (subtitle) { setCopy(subtitle, config.subtitle, 34); subtitle.hidden = !config.subtitle; }
    setCopy(caption, config.timerLabel, 35);
    setCopy(endText, config.finishedText, 22);
    block.hidden = !config.showTimer;
    stage.classList.toggle('timer-hidden', !config.showTimer);
    stage.classList.toggle('motion-off', !config.motion);
    stage.classList.toggle('quality-light', config.quality === 'light');
    dispatchEvent(new Event('ankuzo:appearance'));
    fitCopy();
    document.title = `Ankuzo — ${config.title}`;
  }
  function tick() {
    const timer = state.timer;
    const remaining = timer.running ? Math.max(0, timer.endAt - (Date.now() + timeOffset)) : timer.remainingMs;
    const text = formatTime(remaining / 1000);
    if (display.textContent !== text) display.textContent = text;
    const finished = remaining <= 0;
    const changed = display.hidden !== finished;
    display.hidden = finished;
    endText.hidden = !finished;
    if (changed) fitCopy();
  }
  async function poll() {
    try {
      const url = new URL('api/state', apiBase);
      if (scene === 'break') url.searchParams.set('scene', scene);
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (response.ok) apply(await response.json());
      else if (response.status === 401 && apiBase.pathname.includes('/view/')) {
        stage.style.display = 'none';
        stage.classList.add('motion-off');
        dispatchEvent(new Event('ankuzo:appearance'));
        const notice = document.createElement('p');
        notice.textContent = 'Ссылка заменена. Скопируй новую ссылку из пульта и обнови источник OBS.';
        notice.style.cssText = 'position:fixed;inset:0;display:grid;place-content:center;padding:10%;margin:0;background:#070608;color:#f1e9e3;font:24px/1.6 Arial,sans-serif;text-align:center';
        document.body.append(notice);
        return;
      }
    } catch { /* Keep the last scene and its wall-clock timer while reconnecting. */ }
    setTimeout(poll, 400);
  }
  apply({ ...state, revision: -1 });
  setInterval(tick, 100);
  tick();
  if (location.protocol !== 'file:') poll();
  // Optional local QA data only; no metrics are painted into the broadcast.
  if (new URLSearchParams(location.search).has('diagnostics')) {
    let first = performance.now(), previous = first, frames = 0, worst = 0;
    const sample = time => {
      frames++;
      worst = Math.max(worst, time - previous);
      previous = time;
      if (time - first >= 2000) {
        stage.dataset.fps = (frames * 1000 / (time - first)).toFixed(1);
        stage.dataset.maxFrameMs = worst.toFixed(1);
        first = time; frames = 0; worst = 0;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }
})();
