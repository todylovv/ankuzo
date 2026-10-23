(() => {
  'use strict';
  const $ = id => document.getElementById(id), base = new URL('.', location.href);
  base.username = ''; base.password = '';
  let state = null, dirtyRules = false, connecting = false, stopping = false, session = '', generation = 0;
  let stream, context, source, worklet, gain, heartbeat, packets = [], pre = [], silence = 0, voiced = 0, sequence = 0, queue = [], sending = false;
  let ruleBusy = false, resetBusy = false, lastEvent = '', pollGeneration = 0, statusError = false;
  const fields = ['speech-threshold', 'speech-window', 'speech-cooldown', 'speech-duration'];
  function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('error', error); }
  function status(text, error = false) { statusError = error; message('speech-status', text, error); }
  async function request(route, { body, headers = {}, method = body === undefined ? 'GET' : 'POST', timeout = 6000, raw = false } = {}) {
    const response = await fetch(new URL(route, base), { method, cache: 'no-store', signal: AbortSignal.timeout(timeout),
      headers: { ...(method === 'POST' ? { 'X-Ankuzo-Control': '1', 'Content-Type': raw ? 'application/octet-stream' : 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: raw ? body : JSON.stringify(body) } : {}) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Не удалось прочитать ответ сервера. Обнови пульт.'); }
    if (!response.ok) { const error = new Error(result.error || 'Нет доступа. Обнови пульт и войди заново.'); error.status = response.status; throw error; }
    return result;
  }
  function readable(error) { return ['TypeError', 'TimeoutError', 'AbortError'].includes(error.name) ? 'Нет ответа от сервера. Проверь соединение и повтори.' : error.message; }
  function buttons() {
    $('speech-start').disabled = !state?.health?.ready || Boolean(session) || connecting || stopping || Boolean(state?.active);
    $('speech-stop').disabled = (!session && !connecting) || stopping;
    $('speech-device').disabled = Boolean(session) || connecting || stopping;
    $('speech-devices').disabled = Boolean(session) || connecting || stopping;
    $('speech-reset').disabled = Boolean(session) || connecting || stopping || Boolean(state?.active) || Boolean(state?.processing) || resetBusy || !state;
    $('speech-reset-hint').hidden = !(session || connecting || stopping || state?.active || state?.processing);
  }
  function render(next) {
    state = next;
    $('speech-count').textContent = next.count.toLocaleString('ru-RU');
    $('speech-health').textContent = next.health.ready ? (next.health.model === 'small' ? 'Повышенная точность · русский язык' : 'Распознавание готово · русский язык') : next.health.failed ? 'Распознавание недоступно. Проверка повторится автоматически.' : 'Модель речи загружается. Проверка повторится автоматически.';
    if (!dirtyRules && !ruleBusy) {
      $('speech-enabled').checked = next.rules.enabled; $('speech-show-counter').checked = next.rules.showCounter;
      for (const [id, key] of [['speech-threshold', 'threshold'], ['speech-window', 'windowSeconds'], ['speech-cooldown', 'cooldownSeconds'], ['speech-duration', 'durationSeconds']]) $(id).value = next.rules[key];
    }
    $('speech-last-text').textContent = next.lastText || 'Появится после подключения микрофона.';
    $('speech-latency').textContent = next.lastMetrics ? `Последний фрагмент: ${(next.lastMetrics.audioMs / 1000).toFixed(1)} с звука, ${(next.lastMetrics.processingMs / 1000).toFixed(1)} с обработки.${next.lastMetrics.corrections?.length ? ' Уточнено: ' + next.lastMetrics.corrections.map(item => `${item.heard} → ${item.corrected}`).join(', ') + '.' : ''}` : '';
    const eventKey = next.events[0]?.id || '';
    if (eventKey !== lastEvent || $('speech-events').children.length !== next.events.length) {
      lastEvent = eventKey; $('speech-events').replaceChildren();
      for (const event of next.events) {
        const row = document.createElement('li'), time = document.createElement('time'), words = document.createElement('span'), added = document.createElement('strong');
        time.dateTime = new Date(event.at).toISOString(); time.textContent = new Date(event.at).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        words.textContent = event.words.join(', '); added.textContent = '+' + event.added;
        row.append(time, words, added); $('speech-events').append(row);
      }
    }
    $('speech-log-empty').hidden = next.events.length > 0;
    if (!session && !connecting && !stopping && !statusError) status(next.active ? 'Микрофон подключён в другой вкладке.' : 'Микрофон выключен. Звук не отправляется.');
    buttons();
  }
  async function devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const selected = $('speech-device').value;
    const list = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput');
    $('speech-device').replaceChildren(new Option('Микрофон по умолчанию', ''));
    list.forEach((device, index) => { if (device.deviceId) $('speech-device').add(new Option(device.label || `Микрофон ${index + 1}`, device.deviceId)); });
    if ([...$('speech-device').options].some(option => option.value === selected)) $('speech-device').value = selected;
  }
  $('speech-devices').addEventListener('click', () => devices().catch(() => status('Не удалось получить устройства. Проверь разрешения браузера.', true)));
  function clearCapture() {
    clearInterval(heartbeat); heartbeat = undefined;
    if (worklet) { worklet.port.onmessage = null; worklet.disconnect(); }
    source?.disconnect(); gain?.disconnect();
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (context) { context.onstatechange = null; context.close().catch(() => {}); }
    stream = context = source = worklet = gain = undefined; $('speech-level').value = 0;
  }
  function enqueue() {
    if (voiced < 5 || !packets.length) { packets = []; voiced = 0; silence = 0; return; }
    const audio = new Int16Array(packets.length * 320);
    packets.forEach((packet, index) => audio.set(packet.samples, index * 320));
    queue.push({ body: audio.buffer, offset: packets[0].offset / 16, sequence: sequence++ });
    packets = []; voiced = 0; silence = 0;
    if (queue.length > 3) { stop('Сервер не успевает за речью. Передача остановлена; часть фраз не посчитана.', true, true); return; }
    drain();
  }
  function packet(data) {
    if (!session || stopping) return;
    const samples = data.samples; let square = 0;
    for (const sample of samples) square += (sample / 32768) ** 2;
    const rms = Math.sqrt(square / samples.length);
    $('speech-level').value = Math.min(1, rms * 5);
    const speaking = rms > 0.008;
    if (!packets.length) {
      if (!speaking) { pre.push(data); if (pre.length > 12) pre.shift(); return; }
      packets = [...pre]; pre = [];
    }
    packets.push(data);
    if (speaking) { voiced++; silence = 0; } else silence++;
    if (packets.length >= 400) {
      const overlap = packets.slice(-20);
      enqueue(); if (session && !stopping) { packets = overlap; voiced = 0; }
    } else if (silence >= 35 && packets.length >= 300) enqueue();
  }
  async function drain() {
    if (sending || !session) return;
    sending = true;
    try {
      while (queue.length && session) {
        const chunk = queue[0];
        if (!stopping) status(`Распознаём речь${queue.length > 1 ? ` · в очереди ${queue.length}` : ''}…`);
        let next;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            next = await request('api/speech/audio', { body: chunk.body, raw: true, timeout: 29000, headers: { 'X-Ankuzo-Speech-Session': session, 'X-Audio-Start': String(chunk.offset), 'X-Audio-Sequence': String(chunk.sequence) } });
            break;
          } catch (error) { if (attempt === 1 || [400, 401, 403, 409, 413, 415].includes(error.status)) throw error; }
        }
        queue.shift(); pollGeneration++; render(next);
        if (!stopping) status(`Слушаем: ${stream?.getAudioTracks()[0]?.label || 'микрофон'}.`);
      }
    } catch (error) {
      queue = []; clearCapture();
      const old = session; session = ''; stopping = false;
      if (old) request('api/speech/stop', { body: {}, headers: { 'X-Ankuzo-Speech-Session': old } }).catch(() => {});
      status(readable(error) + ' Передача звука остановлена; последняя фраза могла не посчитаться.', true); buttons();
    } finally { sending = false; }
  }
  async function stop(text = 'Микрофон выключен. Звук не отправляется.', error = false, discard = false) {
    generation++; connecting = false;
    if (stopping) return;
    stopping = true;
    if (!discard) enqueue(); else { packets = []; queue = []; }
    clearCapture(); pre = [];
    status('Микрофон выключен. Завершаем обработку отправленных фраз…'); buttons();
    try {
      // The browser's recording permission and tracks are released immediately;
      // already queued phrases finish before the producer lease is closed.
      while (sending || queue.length) {
        if (!sending) await drain();
        if (sending) await new Promise(resolve => setTimeout(resolve, 60));
      }
      if (session) {
        const next = await request('api/speech/stop', { body: {}, headers: { 'X-Ankuzo-Speech-Session': session } });
        session = ''; pollGeneration++; render(next);
      }
      if (!statusError) status(text, error);
    } catch (reason) { session = ''; status('Микрофон выключен. ' + readable(reason), true); }
    finally { stopping = false; buttons(); }
  }
  $('speech-stop').addEventListener('click', () => stop());
  $('speech-start').addEventListener('click', async () => {
    if (connecting || session || stopping) return;
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) { status('Открой пульт по HTTPS в актуальном Chrome или Edge.', true); return; }
    const current = ++generation; connecting = true; status('Разреши доступ к микрофону в браузере.'); buttons();
    let acquired;
    try {
      // Create the context during the user gesture so autoplay restrictions do
      // not keep the processor suspended after the permission prompt.
      context = new AudioContext({ sampleRate: 16000 }); await context.resume();
      const device = $('speech-device').value;
      acquired = await navigator.mediaDevices.getUserMedia({ audio: { ...(device ? { deviceId: { exact: device } } : {}), channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true }, video: false });
      if (current !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired; await devices();
      await context.audioWorklet.addModule(new URL('mic-worklet.js', base));
      if (current !== generation) return;
      const next = await request('api/speech/start', { body: {} });
      if (current !== generation) { request('api/speech/stop', { body: {}, headers: { 'X-Ankuzo-Speech-Session': next.session } }).catch(() => {}); return; }
      session = next.session; sequence = 0; packets = []; pre = []; silence = 0; voiced = 0; queue = [];
      source = context.createMediaStreamSource(stream); worklet = new AudioWorkletNode(context, 'ankuzo-pcm'); gain = context.createGain(); gain.gain.value = 0;
      worklet.port.onmessage = event => packet(event.data);
      source.connect(worklet).connect(gain).connect(context.destination);
      stream.getAudioTracks()[0].onended = () => stop('Микрофон отключён. Подключи его заново.', true);
      context.onstatechange = () => { if (context?.state === 'suspended' && session && !stopping) stop('Браузер приостановил звук. Нажми «Подключить микрофон» ещё раз.', true); };
      heartbeat = setInterval(async () => {
        try { await request('api/speech/heartbeat', { body: {}, headers: { 'X-Ankuzo-Speech-Session': session } }); }
        catch (error) { if (session && !stopping) stop(readable(error), true, true); }
      }, 5000);
      pollGeneration++; render(next); status(`Слушаем: ${stream.getAudioTracks()[0].label || 'микрофон'}.`);
    } catch (error) {
      console.warn('Microphone connection failed:', error.name, error.message);
      acquired?.getTracks().forEach(track => track.stop()); clearCapture();
      if (session) { const old = session; session = ''; request('api/speech/stop', { body: {}, headers: { 'X-Ankuzo-Speech-Session': old } }).catch(() => {}); }
      if (current === generation) status(error.name === 'NotAllowedError' ? 'Нет разрешения на микрофон. Разреши доступ для ankuzo.online в настройках браузера и повтори.' : error.name === 'NotFoundError' ? 'Микрофон не найден. Подключи устройство и обнови список.' : error.name === 'NotReadableError' ? 'Микрофон недоступен. Проверь настройки устройства и монопольный доступ в Windows.' : readable(error), true);
    } finally { if (current === generation) connecting = false; buttons(); }
  });
  $('speech-rules').addEventListener('input', event => { dirtyRules = true; if (event.target.matches('input')) event.target.removeAttribute('aria-invalid'); });
  $('speech-rules').addEventListener('submit', async event => {
    event.preventDefault(); if (ruleBusy) return;
    let invalid;
    for (const id of fields) {
      const field = $(id), value = Number(field.value);
      const valid = field.value.trim() && Number.isInteger(value) && value >= Number(field.min) && value <= Number(field.max);
      field.setAttribute('aria-invalid', String(!valid)); if (!valid && !invalid) invalid = field;
    }
    if (invalid) { message('speech-rule-feedback', `Введи целое число от ${invalid.min} до ${invalid.max}.`, true); invalid.focus(); return; }
    ruleBusy = true; $('speech-rules').querySelectorAll('input,button').forEach(element => { element.disabled = true; });
    message('speech-rule-feedback', 'Сохраняем правило…');
    try {
      const next = await request('api/speech/rules', { body: { enabled: $('speech-enabled').checked, showCounter: $('speech-show-counter').checked, threshold: Number($('speech-threshold').value), windowSeconds: Number($('speech-window').value), cooldownSeconds: Number($('speech-cooldown').value), durationSeconds: Number($('speech-duration').value) } });
      dirtyRules = false; pollGeneration++; render(next); message('speech-rule-feedback', 'Правило сохранено.');
    } catch (error) { message('speech-rule-feedback', readable(error), true); }
    finally { ruleBusy = false; $('speech-rules').querySelectorAll('input,button').forEach(element => { element.disabled = false; }); }
  });
  $('speech-preview-test').addEventListener('click', () => $('speech-preview').contentWindow.postMessage({ type: 'ankuzo-rage-preview' }, location.origin));
  $('speech-copy').addEventListener('click', async () => {
    $('speech-copy').disabled = true; message('speech-link-feedback', 'Загружаем ссылку…');
    try {
      const result = await request('api/obs-link?scene=rage'); const url = new URL(result.url);
      if (url.origin !== location.origin || !url.pathname.startsWith(base.pathname + 'view/')) throw new Error('Некорректная ссылка. Обнови пульт.');
      $('speech-url').value = url.href;
      try { await navigator.clipboard.writeText(url.href); $('speech-link-manual').hidden = true; message('speech-link-feedback', 'Ссылка скопирована. Вставь её в источник «Браузер» в OBS.'); }
      catch { $('speech-link-manual').hidden = false; $('speech-url').focus(); $('speech-url').select(); message('speech-link-feedback', 'Ссылка выделена. Скопируй её вручную: Ctrl+C.'); }
    } catch (error) { message('speech-link-feedback', readable(error), true); }
    finally { $('speech-copy').disabled = false; }
  });
  $('speech-reset').addEventListener('click', () => { $('speech-reset-confirm').hidden = false; $('speech-reset').setAttribute('aria-expanded', 'true'); $('speech-reset-feedback').hidden = true; $('speech-reset-cancel').focus(); });
  function closeReset() { $('speech-reset-confirm').hidden = true; $('speech-reset').setAttribute('aria-expanded', 'false'); $('speech-reset').focus(); }
  $('speech-reset-cancel').addEventListener('click', closeReset);
  $('speech-reset-confirm').addEventListener('keydown', event => { if (event.key === 'Escape' && !resetBusy) closeReset(); });
  $('speech-reset-do').addEventListener('click', async () => {
    if (resetBusy) return; resetBusy = true; $('speech-reset-do').disabled = true; $('speech-reset-feedback').hidden = true; buttons();
    try { const next = await request('api/speech/reset', { body: {} }); pollGeneration++; render(next); closeReset(); status('Счётчик мата и журнал сброшены.'); }
    catch (error) { $('speech-reset-feedback').hidden = false; message('speech-reset-feedback', readable(error), true); status(readable(error), true); }
    finally { resetBusy = false; $('speech-reset-do').disabled = false; buttons(); if ($('speech-reset-confirm').hidden) $('speech-reset').focus(); }
  });
  addEventListener('pagehide', () => { clearCapture(); session = ''; });
  async function poll() {
    const version = pollGeneration;
    try { const next = await request('api/speech/state'); if (version === pollGeneration) render(next); }
    catch (error) { message('speech-health', readable(error), true); if (state) state.health.ready = false; buttons(); }
    setTimeout(poll, 2000);
  }
  devices().catch(() => {}); poll();
})();
