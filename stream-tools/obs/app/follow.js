(() => {
  'use strict';
  const $ = id => document.getElementById(id), root = $('alert'), card = $('card'), copy = $('copy'), thread = $('thread'), sound = $('sound');
  const embedded = parent !== window && new URLSearchParams(location.search).get('preview') === '1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = { events: [], settings: {}, audio: { available: false } }, offset = 0, active = '', wake = null, end = null, animations = [], demo = false, audioVersion = '';
  const notify = value => { if (embedded) parent.postMessage(value, location.origin); };
  function scale() { const factor = Math.min(innerWidth / 560, innerHeight / 440); $('stage').style.transform = `translate(-50%,-50%) scale(${factor})`; }
  addEventListener('resize', scale); scale();
  function clear() {
    clearTimeout(end); animations.forEach(animation => animation.cancel()); animations = [];
    root.hidden = true; sound.pause(); active = '';
  }
  function play(event, audio, settings=state.settings) {
    clear(); active = event.id;
    const elapsed = Math.max(0, Date.now() + (demo ? 0 : offset) - event.startsAt), duration = event.endsAt - event.startsAt;
    if (elapsed >= duration) { active = ''; return; }
    const premium=event.kind==='subscription',donation=event.kind==='donation',faceUp=premium||donation;root.className=donation?'donation':premium?'premium tier-'+event.tier:'';
    $('donation-amount').hidden=$('donation-text').hidden=!donation;
    $('donation-amount').textContent=donation?new Intl.NumberFormat('ru-RU',{style:'currency',currency:event.currency,maximumFractionDigits:2}).format(Number(event.amount)):'';
    $('donation-text').textContent=donation?event.donationText||'': '';
    document.querySelector('.spade').textContent=donation?'♦':'♠';
    for(const corner of document.querySelectorAll('.corner'))corner.lastChild.textContent=donation?'♦':'♠';
    $('subscription-detail').hidden=!premium;$('subscription-detail').textContent=event.detail||'';
    root.hidden = false; $('caption').textContent = event.message; $('nickname').textContent = event.name;
    $('nickname').style.fontSize = '40px';
    const width = $('nickname').scrollWidth;
    if (width > 508) $('nickname').style.fontSize = Math.max(13, 40 * 508 / width) + 'px';
    const motion = event.motion !== false && !reduced.matches;
    function animate(node, frames, options = {}) {
      const animation = node.animate(frames, { duration, fill: 'both', ...options });
      animation.currentTime = elapsed; animations.push(animation);
    }
    const at = ms => Math.min(.99, ms / duration);
    animate(root, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: at(motion ? 200 : 120) }, { opacity: 1, offset: 1 - 380 / duration }, { opacity: 0, offset: 1 }]);
    if (motion) {
      animate(card, [
        { transform: 'translateY(32px) rotateY(-720deg) rotateZ(-20deg) scale(.68)', offset: 0, easing: 'cubic-bezier(.15,.65,.2,1)' },
        { transform: faceUp?'translateY(-5px) rotateY(554deg) rotateZ(2deg) scale(1.02)':'translateY(-5px) rotateY(14deg) rotateZ(2deg) scale(1.02)', offset: at(1700), easing: 'cubic-bezier(.2,.8,.2,1)' },
        { transform: faceUp?'translateY(0) rotateY(540deg) rotateZ(0deg) scale(1)':'translateY(0) rotateY(0deg) rotateZ(-5deg) scale(1)', offset: at(2100) },
        { transform: faceUp?'translateY(0) rotateY(540deg) rotateZ(0deg) scale(1)':'translateY(0) rotateY(0deg) rotateZ(-5deg) scale(1)', offset: 1 - 380 / duration },
        { transform: faceUp?'translateY(-12px) rotateY(540deg) rotateZ(0deg) scale(.96)':'translateY(-12px) rotateY(0deg) rotateZ(-5deg) scale(.96)', offset: 1 }
      ]);
      animate($(faceUp?'premium-glint':'glint'), [{ opacity: 0, transform: 'translateX(0) skewX(-20deg)', offset: 0 }, { opacity: 0, transform: 'translateX(0) skewX(-20deg)', offset: at(1600) }, { opacity: .9, offset: at(1850) }, { opacity: 0, transform: 'translateX(350%) skewX(-20deg)', offset: at(2400) }, { opacity: 0, offset: 1 }]);
      if(premium||donation){
        for(const [id,direction] of [['fan-left',-1],['fan-right',1]]){
          const spread=donation?`translate(${direction*77}px,22px) rotate(${direction*25}deg) scale(.85)`:`translate(${direction*94}px,21px) rotate(${direction*24}deg) scale(.88)`;
          animate($(id),[{opacity:0,transform:'translate(0,30px) rotate(0deg) scale(.62)',offset:0},{opacity:0,transform:'translate(0,30px) rotate(0deg) scale(.62)',offset:at(380)},{opacity:1,transform:spread,offset:at(1800),easing:'cubic-bezier(.18,.8,.2,1)'},{opacity:1,transform:spread,offset:1-380/duration},{opacity:0,transform:`translate(${direction*40}px,0) rotate(${direction*8}deg) scale(.75)`,offset:1}]);
        }
        animate($('royal-thread'),[{opacity:0,transform:'scale(.7)',offset:0},{opacity:0,transform:'scale(.7)',offset:at(700)},{opacity:.65,transform:'scale(1)',offset:at(2200)},{opacity:.65,transform:'scale(1)',offset:1}]);
      }
    }
    if(donation&&motion){
      animate($('donation-rays'),[{opacity:0,transform:'translateY(8px) scale(.86)',offset:0},{opacity:0,transform:'translateY(8px) scale(.86)',offset:at(700)},{opacity:.8,transform:'translateY(0) scale(1)',offset:at(1800)},{opacity:.3,transform:'translateY(-4px) scale(1.025)',offset:at(2900)},{opacity:0,transform:'translateY(-8px) scale(1.04)',offset:at(3800)},{opacity:0,offset:1}]);
      animate($('donation-amount'),[{opacity:0,transform:'translateY(13px) scale(.94)',offset:0},{opacity:0,transform:'translateY(13px) scale(.94)',offset:at(1650)},{opacity:1,transform:'translateY(0) scale(1)',offset:at(2250),easing:'cubic-bezier(.16,1,.3,1)'},{opacity:1,transform:'translateY(0) scale(1)',offset:1}]);
    }
    for (const [node, delay] of [[thread, motion ? 1400 : 0], [copy, motion ? 1650 : 0]]) {
      animate(node, [{ opacity: 0, transform: motion ? 'translateY(10px)' : 'none', offset: 0 }, { opacity: 0, transform: motion ? 'translateY(10px)' : 'none', offset: at(delay) }, { opacity: 1, transform: 'translateY(0)', offset: at(delay + 350) }, { opacity: 1, transform: 'translateY(0)', offset: 1 }]);
    }
    if (audio?.available && settings.volume > 0 && elapsed < 1200) {
      if (audioVersion !== audio.version) { sound.src = new URL('api/follow/audio?kind='+(donation?'donation':premium?'subscription':'follow')+'&v=' + encodeURIComponent(audio.version), location.href).href; audioVersion = audio.version; }
      sound.volume = settings.volume; sound.currentTime = 0;
      sound.play().then(() => notify({ type: 'follow-audio', ok: true })).catch(() => notify({ type: 'follow-audio', ok: false }));
    }
    end = setTimeout(() => { clear(); if (demo) { demo = false; notify({ type: 'follow-preview-ended' }); } schedule(); }, duration - elapsed);
  }
  function schedule() {
    clearTimeout(wake); if (demo) return;
    const time = Date.now() + offset, event = state.events.find(event => event.startsAt <= time && event.endsAt > time);
    const profile=event?.kind==='donation'?state.donation:event?.kind==='subscription'?state.subscription:state;
    if(event&&!profile?.settings.enabled){clear();return;}
    if (event) { if (active !== event.id) play(event, profile.audio,profile.settings); }
    else { clear(); const next = state.events.find(event => event.startsAt > time); if (next) wake = setTimeout(schedule, Math.max(1, next.startsAt - time)); }
  }
  if (embedded) {
    addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'follow-preview') return;
      const value = event.data;
      if (typeof value.name !== 'string' || value.name.length > 64) return;
      clearTimeout(wake); demo = true;
      state.settings = { volume: Math.min(1, Math.max(0, Number(value.settings?.volume) || 0)) };
      const duration = Math.min(15, Math.max(6, Number(value.settings?.duration) || 8)) * 1000;
      play({ id: 'preview:' + Date.now(), name: value.name, kind:['subscription','donation'].includes(value.kind)?value.kind:'follow',amount:String(value.amount||'500'),currency:['RUB','USD','EUR','BYN','KZT','UAH','BRL','TRY'].includes(value.currency)?value.currency:'RUB',donationText:String(value.donationText||'').slice(0,500),tier:['1000','2000','3000'].includes(value.tier)?value.tier:'1000',detail:String(value.detail||'').slice(0,100), message: String(value.settings?.message || 'Спасибо за фоллоу').slice(0, 60), motion: value.settings?.motion !== false, startsAt: Date.now(), endsAt: Date.now() + duration }, value.audio);
    });
    notify({ type: 'follow-preview-ready' });
  } else {
    const feed = new EventSource(new URL('api/follow/stream', location.href));
    feed.onmessage = event => { try { const next = JSON.parse(event.data); if (!Array.isArray(next.events) || !next.settings) return; state = next; offset = next.serverNow - Date.now(); schedule(); } catch {} };
    addEventListener('pagehide', () => { feed.close(); clearTimeout(wake); clear(); }, { once: true });
  }
})();
