(() => {
  const SB_URL = 'https://ppurfykznriopzxrafox.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdXJmeWt6bnJpb3B6eHJhZm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDgyNTMsImV4cCI6MjA5NTg4NDI1M30.uqPWzd_xLaJm12ViYZCVlYnxIdv80ZZoibmZH1DPdkg';
  const TOPIC = 'realtime:live-network';
  const isTouch = matchMedia('(pointer:coarse)').matches;
  const sessionId = getSessionId();
  const nodeName = makeNodeName(sessionId);
  const cursors = new Map();
  const presence = new Set();
  let channel;
  let cursorTimer = 0;
  let cursorsOn = localStorage.getItem('_ankuzo_cursors') !== 'off';
  let signalsPage = 0;
  let signalsAvailable = true;
  let signalCount = 0;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="ln-cursor-layer" id="lnCursorLayer" aria-hidden="true"></div>
    <div class="live-network">
      <div class="ln-dock">
        <div class="ln-dock-head">
          <span class="ln-dock-name">live network</span>
          <span class="ln-dock-node">${nodeName}</span>
        </div>
        <div class="ln-dock-body">
          <div class="ln-pill"><span class="ln-dot connecting" id="lnStatusDot"></span><span id="lnOnline">--</span> online <span class="ln-sep">/</span> <span id="lnVisits">—</span> visits</div>
          <div class="ln-actions">
            <button class="ln-button ln-network-toggle ${cursorsOn ? 'on' : ''}" id="lnNetworkToggle">${isTouch ? 'taps' : 'cursors'} ${cursorsOn ? 'on' : 'off'}</button>
            <button class="ln-button" id="lnSignalsButton">signals <span class="ln-sep">/</span> <span id="lnSignalCount">00</span></button>
          </div>
        </div>
      </div>
    </div>
    <aside class="ln-panel" id="lnPanel" aria-label="Signal wall">
      <div class="ln-head"><div><div class="ln-title">signal wall</div><div class="ln-subtitle">ephemeral messages / ttl 24h</div></div><button class="ln-close" id="lnClose" aria-label="Закрыть">×</button></div>
      <div class="ln-list" id="lnList"></div>
      <button class="ln-more" id="lnMore" hidden>загрузить ещё</button>
      <form class="ln-form" id="lnForm">
        <textarea class="ln-input" id="lnInput" maxlength="100" placeholder="Оставить короткий сигнал..." required></textarea>
        <div class="ln-form-row"><span class="ln-note">до 100 символов · один сигнал в 3 часа</span><button class="ln-send" id="lnSend">отправить</button></div>
      </form>
    </aside>
  `);

  const cursorLayer = document.getElementById('lnCursorLayer');
  const onlineEl = document.getElementById('lnOnline');
  const visitsEl = document.getElementById('lnVisits');
  const statusDot = document.getElementById('lnStatusDot');
  const panel = document.getElementById('lnPanel');
  const list = document.getElementById('lnList');
  const more = document.getElementById('lnMore');
  const input = document.getElementById('lnInput');
  const send = document.getElementById('lnSend');
  const signalCountEl = document.getElementById('lnSignalCount');

  function getSessionId() {
    let id = sessionStorage.getItem('_ankuzo_live_session');
    if (!id) {
      id = 'node_' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
      sessionStorage.setItem('_ankuzo_live_session', id);
    }
    return id;
  }

  function makeNodeName(value) {
    let hash = 0;
    for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return 'node_' + String(hash % 1000).padStart(3, '0');
  }

  function api(path, options = {}) {
    return fetch(`${SB_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }).then(async response => {
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.message || String(response.status));
      return data;
    });
  }

  function rpc(name, body) {
    return api(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
  }

  function broadcast(event, payload) {
    if (!cursorsOn || !channel) return;
    channel.send({ type: 'broadcast', event, payload: { ...payload, id: sessionId, name: nodeName } });
  }

  function connect() {
    if (!window.supabase?.createClient) {
      statusDot.className = 'ln-dot offline';
      return;
    }
    const client = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    channel = client.channel(TOPIC.replace('realtime:', ''), {
      config: { broadcast: { self: false, ack: false }, presence: { key: sessionId } }
    });
    channel
      .on('presence', { event: 'sync' }, () => syncPresence(channel.presenceState()))
      .on('presence', { event: 'join' }, ({ key }) => applyPresenceDiff({ joins: { [key]: true } }))
      .on('presence', { event: 'leave' }, ({ key }) => applyPresenceDiff({ leaves: { [key]: true } }))
      .on('broadcast', { event: 'cursor' }, receiveBroadcast)
      .on('broadcast', { event: 'pulse' }, receiveBroadcast)
      .on('broadcast', { event: 'signal' }, receiveBroadcast)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          statusDot.className = 'ln-dot';
          await channel.track({ name: nodeName, online_at: new Date().toISOString() });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          statusDot.className = 'ln-dot offline';
          onlineEl.textContent = '--';
        }
      });
  }

  function syncPresence(state) {
    presence.clear();
    Object.keys(state).forEach(key => presence.add(key));
    updateOnline();
  }

  function applyPresenceDiff(diff) {
    Object.keys(diff.joins || {}).forEach(key => presence.add(key));
    Object.keys(diff.leaves || {}).forEach(key => presence.delete(key));
    updateOnline();
  }

  function updateOnline() {
    onlineEl.textContent = presence.size;
  }

  function syncVisits() {
    const footerVisits = document.getElementById('visitorCount');
    if (!footerVisits) return;
    visitsEl.textContent = footerVisits.textContent;
    new MutationObserver(() => {
      visitsEl.textContent = footerVisits.textContent;
    }).observe(footerVisits, { childList: true, characterData: true, subtree: true });
  }

  function receiveBroadcast(message) {
    const payload = message.payload || {};
    if (!cursorsOn || payload.id === sessionId) return;
    if (message.event === 'cursor' && !isTouch) renderCursor(payload);
    if (message.event === 'pulse') renderPulse(payload);
    if (message.event === 'signal') refreshSignals();
  }

  function renderCursor(data) {
    if (Math.abs((data.scroll || 0) - scrollProgress()) > .12) return;
    let cursor = cursors.get(data.id);
    if (!cursor) {
      if (cursors.size >= 6) {
        const oldest = [...cursors.entries()].sort((a, b) => a[1].updated - b[1].updated)[0];
        oldest?.[1].el.remove();
        if (oldest) cursors.delete(oldest[0]);
      }
      const el = document.createElement('div');
      el.className = 'ln-cursor';
      el.innerHTML = `<div class="ln-cursor-mark"></div><div class="ln-cursor-name"></div>`;
      cursorLayer.appendChild(el);
      cursor = { el, updated: 0 };
      cursors.set(data.id, cursor);
    }
    cursor.updated = Date.now();
    cursor.el.querySelector('.ln-cursor-name').textContent = data.name || 'node';
    cursor.el.style.transform = `translate(${Math.round(data.x * innerWidth)}px,${Math.round(data.y * innerHeight)}px)`;
  }

  function renderPulse(data) {
    if (Math.abs((data.scroll || 0) - scrollProgress()) > .12) return;
    while (cursorLayer.querySelectorAll('.ln-pulse').length >= 4) cursorLayer.querySelector('.ln-pulse')?.remove();
    const pulse = document.createElement('div');
    pulse.className = 'ln-pulse';
    pulse.style.left = `${data.x * 100}%`;
    pulse.style.top = `${data.y * 100}%`;
    cursorLayer.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1600);
  }

  function scrollProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? scrollY / max : 0;
  }

  addEventListener('pointermove', event => {
    if (isTouch || !cursorsOn) return;
    const now = Date.now();
    if (now - cursorTimer < 125) return;
    cursorTimer = now;
    broadcast('cursor', { x: event.clientX / innerWidth, y: event.clientY / innerHeight, scroll: scrollProgress() });
  }, { passive: true });

  addEventListener('pointerdown', event => {
    if (!isTouch || !cursorsOn) return;
    const pulse = { x: event.clientX / innerWidth, y: event.clientY / innerHeight, scroll: scrollProgress() };
    renderPulse(pulse);
    broadcast('pulse', pulse);
  }, { passive: true });

  setInterval(() => {
    const staleAt = Date.now() - 5000;
    cursors.forEach((cursor, id) => {
      if (cursor.updated < staleAt) {
        cursor.el.remove();
        cursors.delete(id);
      }
    });
  }, 1500);

  document.getElementById('lnNetworkToggle').onclick = event => {
    cursorsOn = !cursorsOn;
    localStorage.setItem('_ankuzo_cursors', cursorsOn ? 'on' : 'off');
    event.currentTarget.classList.toggle('on', cursorsOn);
    event.currentTarget.textContent = `${isTouch ? 'taps' : 'cursors'} ${cursorsOn ? 'on' : 'off'}`;
    if (!cursorsOn) {
      cursors.forEach(cursor => cursor.el.remove());
      cursors.clear();
      cursorLayer.querySelectorAll('.ln-pulse').forEach(pulse => pulse.remove());
    }
  };

  document.getElementById('lnSignalsButton').onclick = () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) loadSignals(true);
  };
  document.getElementById('lnClose').onclick = () => panel.classList.remove('open');
  more.onclick = () => loadSignals(false);
  document.getElementById('lnForm').onsubmit = async event => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    send.disabled = true;
    try {
      await rpc('submit_network_signal', { p_visitor_id: sessionId, p_node_name: nodeName, p_body: body });
      input.value = '';
      broadcast('signal', {});
      await loadSignals(true);
    } catch (error) {
      alert(error.message.includes('rate_limit') ? 'Можно оставить только один сигнал раз в 3 часа.' : 'Signal Wall пока недоступна.');
    } finally {
      send.disabled = false;
    }
  };

  async function refreshSignals() {
    await loadSignalCount();
    if (panel.classList.contains('open')) loadSignals(true);
  }

  async function loadSignalCount() {
    try {
      const response = await fetch(`${SB_URL}/rest/v1/network_signals?select=id&status=eq.active&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact', Range: '0-0' }
      });
      if (!response.ok) throw new Error();
      signalCount = Number(response.headers.get('content-range')?.split('/')[1] || 0);
      signalCountEl.textContent = String(signalCount).padStart(2, '0');
    } catch {
      signalsAvailable = false;
      signalCountEl.textContent = '--';
    }
  }

  async function loadSignals(reset) {
    if (!signalsAvailable) {
      list.innerHTML = '<div class="ln-empty">Signal Wall ожидает настройки Supabase.<br>Примени файл supabase-live-network.sql.</div>';
      document.getElementById('lnForm').hidden = true;
      return;
    }
    if (reset) {
      signalsPage = 0;
      list.innerHTML = '';
    }
    try {
      const offset = signalsPage * 5;
      const rows = await api(`network_signals?select=id,node_name,body,created_at&status=eq.active&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=5&offset=${offset}`);
      if (reset && !rows.length) list.innerHTML = '<div class="ln-empty">Сигналов пока нет.<br>Оставь первый.</div>';
      if (rows.length) list.insertAdjacentHTML('beforeend', rows.map(renderSignal).join(''));
      more.hidden = rows.length < 5 || offset + rows.length >= signalCount;
      signalsPage++;
    } catch {
      signalsAvailable = false;
      loadSignals(true);
    }
  }

  function renderSignal(signal) {
    return `<article class="ln-signal">
      <div class="ln-signal-meta"><span>${escapeHtml(signal.node_name)}</span><span>${timeAgo(signal.created_at)}</span></div>
      <div class="ln-signal-body">${escapeHtml(signal.body)}</div>
      <button class="ln-report" data-signal="${signal.id}">пожаловаться</button>
    </article>`;
  }

  list.onclick = async event => {
    const button = event.target.closest('.ln-report');
    if (!button) return;
    button.disabled = true;
    try {
      await rpc('report_network_signal', { p_signal_id: button.dataset.signal, p_visitor_id: sessionId });
      button.textContent = 'жалоба отправлена';
    } catch {
      button.textContent = 'уже отправлено';
    }
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function timeAgo(value) {
    const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'сейчас';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
    return `${Math.floor(seconds / 3600)} ч`;
  }

  connect();
  syncVisits();
  loadSignalCount();
  setInterval(loadSignalCount, 60000);
})();
