(() => {
  'use strict';
  const stage = document.getElementById('rage-stage'), counter = document.getElementById('rage-counter'), reaction = document.getElementById('rage-reaction');
  const base = new URL('.', location.href); base.username = ''; base.password = '';
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  let hideTimer, testUntil = 0;
  function fit() { stage.style.setProperty('--scale', Math.min(innerWidth / 1920, innerHeight / 1080)); }
  function apply(state) {
    counter.hidden = !state.showCounter; document.getElementById('rage-number').textContent = String(state.count);
    clearTimeout(hideTimer);
    const duration = Math.max(testUntil - Date.now(), state.trigger ? state.trigger.until - state.serverNow : 0);
    reaction.hidden = duration <= 0;
    if (duration > 0) hideTimer = setTimeout(() => { reaction.hidden = true; }, duration);
  }
  addEventListener('message', event => {
    if (!preview || event.origin !== location.origin || event.source !== parent || event.data?.type !== 'ankuzo-rage-preview') return;
    testUntil = Date.now() + 5000; reaction.hidden = false;
    clearTimeout(hideTimer); hideTimer = setTimeout(() => { reaction.hidden = true; }, 5000);
  });
  async function poll() {
    try {
      const response = await fetch(new URL('api/speech-overlay', base), { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (response.ok) apply(await response.json());
      else if ([401, 403].includes(response.status)) { clearTimeout(hideTimer); counter.hidden = true; reaction.hidden = true; return; }
    } catch { reaction.hidden = true; }
    setTimeout(poll, 500);
  }
  fit(); addEventListener('resize', fit); poll();
})();
