import { useEffect } from 'react';

const criticalScripts = [
  'legacy-runtime.js',
  'intro-engine.js',
  'studio-motion.js',
  'scroll-experience.js',
  'ps5-profile.js'
];

const idleScripts = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'live-network.js'
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.ankuzoRuntime = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function useLegacyRuntime() {
  useEffect(() => {
    let cancelled = false;
    let idleLoaded = false;

    (async () => {
      for (const src of criticalScripts) {
        if (cancelled) return;
        await loadScript(src);
      }
      if (matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
        await loadScript('hero-shader.js');
      }
      const loadIdleScripts = async () => {
        if (idleLoaded) return;
        idleLoaded = true;
        for (const src of idleScripts) {
          if (cancelled) return;
          await loadScript(src);
        }
      };
      addEventListener('pointerdown', loadIdleScripts, { once: true, passive: true });
      addEventListener('keydown', loadIdleScripts, { once: true });
    })().catch(error => console.error('ANKUZO runtime failed to load', error));

    return () => {
      cancelled = true;
    };
  }, []);
}
