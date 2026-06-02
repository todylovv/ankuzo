import { useEffect } from 'react';

const scripts = [
  'legacy-runtime.js',
  'intro-engine.js',
  'studio-motion.js',
  'hero-shader.js',
  'scroll-experience.js',
  'ps5-profile.js',
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

    (async () => {
      for (const src of scripts) {
        if (cancelled) return;
        await loadScript(src);
      }
    })().catch(error => console.error('ANKUZO runtime failed to load', error));

    return () => {
      cancelled = true;
    };
  }, []);
}
