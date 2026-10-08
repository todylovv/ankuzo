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
  return new Promise(resolve => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', settle);
      signal.removeEventListener('abort', settle);
      resolve();
    };
    const loaded = () => {
      if (image.decode) image.decode().then(settle, settle);
      else settle();
    };
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', settle, { once: true });
    signal.addEventListener('abort', settle, { once: true });
    if (signal.aborted) settle();
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
  const data = eventReady('ankuzo:data-ready', life.signal);
  const preload = src => {
    const image = new Image(); image.src = src;
    return imageReady(image, life.signal);
  };
  const visibleImages = Promise.all([app, data]).then(() => {
    if (life.signal.aborted) return;
    const images = [...root.querySelectorAll('.scene:not([inert]) img, .traveller:not([inert]) img')];
    return Promise.all(images.map(image => imageReady(image, life.signal)));
  });
  skip.addEventListener('click', () => life.abort(), { signal: life.signal });
  // Escape gives keyboard users the same immediate way into the page.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') life.abort();
  }, { signal: life.signal });
  waitForIntro([
    app, data, scene.ready, document.fonts?.ready ?? Promise.resolve(),
    preload('/art/character.png'), preload('/art/card-back.png'), visibleImages,
  ], {
    minMs: staticGraphics ? 0 : 4600,
    timeoutMs: 12000,
    signal: life.signal,
    onProgress: (done, total) => { bar.style.transform = `scaleX(${done / total})`; },
  }).then(({ aborted }) => {
    const restoreFocus = overlay.contains(document.activeElement);
    status.textContent = aborted ? 'Вход' : 'Готово';
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
