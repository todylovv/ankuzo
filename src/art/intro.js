import { mountIntroScene } from './introScene.js';
import { waitForIntro } from './introGate.js';
import { initialQuality, parsePreference } from './qualityPolicy.js';

function eventReady(name, signal) {
  return new Promise(resolve => {
    const settle = () => {
      document.removeEventListener(name, settle);
      signal.removeEventListener('abort', settle);
      resolve();
    };
    document.addEventListener(name, settle, { once: true });
    signal.addEventListener('abort', settle, { once: true });
    if (signal.aborted) settle();
  });
}

function imageReady(image, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = error => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancelled);
      if (error) reject(error); else resolve();
    };
    const failed = () => settle(new Error('Image unavailable'));
    const cancelled = () => settle();
    const loaded = () => {
      if (!image.naturalWidth) return failed();
      if (image.decode) image.decode().then(() => settle(), failed);
      else settle();
    };
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', cancelled, { once: true });
    if (signal.aborted) cancelled();
    else if (image.complete) loaded();
  });
}

export function startIntro() {
  const overlay = document.getElementById('site-intro');
  const root = document.getElementById('root');
  if (!overlay || !root) return;
  let staticGraphics = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let preference = 'auto';
  try { preference = parsePreference(localStorage.getItem('ankuzo.graphics.v1')); } catch { /* Optional storage. */ }
  staticGraphics ||= preference === 'off' || (preference === 'auto' && initialQuality({ cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory }) === 'off');
  if (staticGraphics) overlay.classList.add('intro-static');
  const scene = mountIntroScene(overlay, { staticGraphics });
  const life = new AbortController();
  const skip = overlay.querySelector('button');
  const bar = overlay.querySelector('.intro-progress i');
  const status = overlay.querySelector('[role="status"]');
  const app = eventReady('ankuzo:app-ready', life.signal);
  const preload = src => {
    const image = new Image(); image.src = src;
    return imageReady(image, life.signal);
  };
  skip.addEventListener('click', () => life.abort(), { signal: life.signal });
  // Escape gives keyboard users the same immediate way into the page.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') life.abort();
  }, { signal: life.signal });
  waitForIntro([
    app, scene.ready, document.fonts?.ready ?? Promise.resolve(),
    preload('/art/character-display-v1.webp'), preload('/art/card-back-display-v1.webp'),
  ], {
    minMs: staticGraphics ? 0 : 4600,
    timeoutMs: 12000,
    signal: life.signal,
    onProgress: (done, total, failed) => {
      // Completed checkpoints, not a simulated byte percentage or animation timer.
      bar.style.transform = `scaleX(${(done - failed) / total})`;
      status.textContent = done === total
        ? failed ? 'Часть ресурсов недоступна' : 'Страница готова'
        : `Ресурсы · ${done} / ${total}`;
      overlay.dataset.resourcesReady = String(done);
      overlay.dataset.resourcesFailed = String(failed);
    },
  }).then(({ aborted, timedOut, failed }) => {
    const restoreFocus = overlay.contains(document.activeElement);
    status.textContent = aborted ? 'Вход' : timedOut || failed ? 'Открываем страницу' : 'Страница готова';
    life.abort();
    scene.exit();
    overlay.classList.add('intro-exit');
    const close = () => {
      scene.dispose();
      overlay.remove();
      document.body.classList.remove('intro-pending');
      root.inert = false;
      root.removeAttribute('aria-busy');
      document.dispatchEvent(new Event('ankuzo:intro-complete'));
      if (restoreFocus) (root.querySelector('.brand') ?? root.querySelector('a, button'))?.focus({ preventScroll: true });
    };
    // A timer also works when a background tab suppresses transition events.
    setTimeout(close, staticGraphics ? 50 : aborted ? 180 : 850);
  });
}
