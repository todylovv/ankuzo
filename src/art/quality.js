import { initialQuality, frameQuality, parsePreference } from './qualityPolicy.js';

const KEY = 'ankuzo.graphics.v1';
const labels = { off: 'Без анимаций', motion: 'Анимации', full: 'Полные эффекты' };

export function mountQuality(root) {
  const life = new AbortController();
  const listen = (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: life.signal });
  const control = root.querySelector('.quality-control');
  const status = control.querySelector('[role="status"]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let preference = 'auto';
  try { preference = parsePreference(localStorage.getItem(KEY)); } catch { /* Private storage can be unavailable. */ }
  const detect = () => initialQuality({ reduced: media.matches, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory });
  let mode = preference === 'auto' ? detect() : preference;
  let disposed = false, generation = 0, stopFull = null, fullLife = null, unavailable = false;
  let raf = 0, last = 0, samples = [], poorWindows = 0, warmUntil = performance.now() + 5000;

  function announce(reason = '') {
    root.dataset.quality = mode;
    root.dataset.qualitySource = preference;
    control.querySelector('.quality-label').textContent = `${preference === 'auto' ? 'Авто · ' : ''}${labels[mode]}`;
    control.querySelectorAll('input').forEach(input => { input.checked = input.value === mode; });
    control.querySelector('[data-quality-auto]').setAttribute('aria-pressed', String(preference === 'auto'));
    status.textContent = reason || (preference === 'auto' ? 'Подбирается по устройству и плавности. Данные остаются в браузере.' : 'Твой выбор сохранён на этом устройстве. Ручной режим не снижается автоматически.');
    root.dispatchEvent(new CustomEvent('ankuzo:quality-change', { detail: mode }));
  }
  async function loadFull() {
    const token = ++generation;
    fullLife?.abort(); fullLife = null; stopFull?.(); stopFull = null;
    root.classList.remove('webgl-ready');
    if (mode !== 'full' || document.body.classList.contains('intro-pending')) return;
    const timeout = setTimeout(() => { if (!disposed && token === generation) failFull(); }, 10000);
    try {
      const { mountFullScene } = await import('./fullScene');
      if (disposed || token !== generation || mode !== 'full') return;
      fullLife = new AbortController();
      const stop = await mountFullScene(root, () => { if (!disposed && token === generation) failFull(); }, fullLife.signal);
      if (disposed || token !== generation || mode !== 'full') { stop(); return; }
      stopFull = stop;
      root.classList.add('webgl-ready');
      warmUntil = performance.now() + 5000;
    } catch { if (!disposed && token === generation) failFull(); }
    finally { clearTimeout(timeout); }
  }
  function failFull() {
    unavailable = true;
    control.querySelector('input[value="full"]').disabled = true;
    apply('motion', 'Полные эффекты недоступны в этом браузере. Сохранены лёгкие анимации.');
  }
  function apply(next, reason = '') {
    if (next === 'full' && unavailable) reason = 'Полные эффекты недоступны в этом браузере. Сохранены лёгкие анимации.';
    mode = next === 'full' && unavailable ? 'motion' : next;
    samples = []; poorWindows = 0; last = 0; warmUntil = performance.now() + 5000;
    announce(reason); void loadFull(); resume();
  }
  function choose(value) {
    preference = parsePreference(value);
    try { localStorage.setItem(KEY, preference); } catch { /* Still works for this visit. */ }
    apply(preference === 'auto' ? detect() : preference);
  }
  function sample(now) {
    raf = 0;
    if (disposed || preference !== 'auto' || mode === 'off' || document.hidden) return;
    const blocked = document.body.classList.contains('intro-pending') || root.querySelector('dialog[open]') || now < warmUntil || (mode === 'full' && !root.classList.contains('webgl-ready'));
    if (!blocked && last) samples.push(now - last);
    else samples = [];
    last = now;
    if (samples.length >= 120) {
      const next = frameQuality(mode, samples); samples = [];
      poorWindows = next === mode ? 0 : poorWindows + 1;
      if (poorWindows >= 2) { apply(next, 'Эффекты облегчены, чтобы сохранить плавность. Можно выбрать режим вручную.'); return; }
    }
    raf = requestAnimationFrame(sample);
  }
  function resume() {
    cancelAnimationFrame(raf); last = 0; samples = [];
    if (!disposed && preference === 'auto' && mode !== 'off' && !document.hidden) raf = requestAnimationFrame(sample);
  }
  listen(control, 'change', event => { if (event.target.matches('input[name="graphics"]')) choose(event.target.value); });
  listen(control.querySelector('[data-quality-auto]'), 'click', () => choose('auto'));
  listen(root, 'ankuzo:static-request', () => choose('off'));
  listen(media, 'change', () => { if (preference === 'auto') apply(detect()); });
  listen(document, 'visibilitychange', () => { warmUntil = performance.now() + 2000; resume(); });
  listen(window, 'resize', () => { warmUntil = performance.now() + 2000; });
  listen(document, 'ankuzo:intro-complete', () => { void loadFull(); resume(); });
  listen(document, 'pointerdown', event => { if (!control.contains(event.target)) control.open = false; });
  listen(document, 'keydown', event => { if (event.key === 'Escape' && control.open) { control.open = false; control.querySelector('summary').focus(); } });
  apply(mode);
  return () => { disposed = true; ++generation; life.abort(); cancelAnimationFrame(raf); fullLife?.abort(); stopFull?.(); root.classList.remove('webgl-ready'); };
}
