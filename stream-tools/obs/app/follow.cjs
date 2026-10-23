'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const {createDonationAlerts,donationData}=require('./donationalerts.cjs');
const DONATION_DEFAULTS={enabled:true,duration:12,message:'Спасибо за поддержку',motion:true,volume:.7};
const SCOPE = 'moderator:read:followers';
const SUB_SCOPE = 'channel:read:subscriptions';
const SUB_DEFAULTS = { enabled:true,duration:10,message:'Спасибо за подписку',motion:true,volume:.8 };
const paidTypes = new Set(['channel.subscribe','channel.subscription.message','channel.subscription.gift']);
function paidData(value){
 const eventType=value.eventType||'new',tier=value.tier||'1000';
 if(!['new','resub','gift'].includes(eventType)||!['1000','2000','3000'].includes(tier))throw new Error('Неверный тип подписки.');
 const months=value.months??1,total=value.total??1;
 if(!Number.isInteger(months)||months<1||months>1200||!Number.isInteger(total)||total<1||total>10000)throw new Error('Неверное количество подписок или месяцев.');
 const level=Number(tier)/1000;
 return {eventType,tier,months,total,detail:eventType==='gift'?`Подарено: ${total} · Tier ${level}`:eventType==='resub'?`Месяцев вместе: ${months} · Tier ${level}`:`Новая подписка · Tier ${level}`};
}
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const DEFAULTS = { enabled: true, duration: 8, message: 'Спасибо за фоллоу', motion: true, volume: .6 };

function createFollow({ directory = null, origin = '', now = Date.now, fetchImpl = fetch, WebSocketImpl = WebSocket, schedule = true } = {}) {
  const read = name => { try { return JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; return {}; } };
  const save = (name, value) => {
    if (!directory) return;
    const file = path.join(directory, name), temp = file + '.' + randomBytes(6).toString('hex') + '.tmp';
    try { fs.writeFileSync(temp, JSON.stringify(value) + '\n', { mode: 0o600 }); fs.renameSync(temp, file); }
    finally { try { fs.unlinkSync(temp); } catch {} }
  };
  function validateSettings(input, previous = DEFAULTS) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Неверные настройки.');
    const next = { ...previous };
    for (const key of Object.keys(input)) {
      if (!Object.hasOwn(DEFAULTS, key)) throw new Error('Неизвестная настройка.');
      const value = input[key];
      if (['enabled', 'motion'].includes(key) && typeof value !== 'boolean') throw new Error('Неверный переключатель.');
      if (key === 'duration' && (!Number.isInteger(value) || value < 6 || value > 15)) throw new Error('Длительность: от 6 до 15 секунд.');
      if (key === 'volume' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) throw new Error('Громкость: от 0 до 100%.');
      if (key === 'message' && (typeof value !== 'string' || value.length > 60 || !value.trim() || /[\x00-\x1f]/.test(value))) throw new Error('Подпись: от 1 до 60 символов.');
      next[key] = key === 'message' ? value.trim() : value;
    }
    return next;
  }
  let settings = directory ? validateSettings(read('follow-settings.json')) : { ...DEFAULTS };
  let subscriptionSettings=directory?validateSettings(read('subscription-settings.json'),SUB_DEFAULTS):{...SUB_DEFAULTS};
  let subscriptionAudio=directory?read('subscription-audio.json'):{},subscriptionBytes=null,subscriptionConnection='disconnected';
  let donationSettings=directory?validateSettings(read('donation-settings.json'),DONATION_DEFAULTS):{...DONATION_DEFAULTS};
  let donationAudio=directory?read('donation-audio.json'):{},donationBytes=null;
  const profile=kind=>kind==='donation'?{settings:donationSettings,audio:donationAudio}:kind==='subscription'?{settings:subscriptionSettings,audio:subscriptionAudio}:{settings,audio};
  let credentials = directory ? read('follow-private.json') : {};
  let audio = directory ? read('follow-audio.json') : {}, audioBytes = null;
  let events = [], closed = false, connection = 'disconnected', lastError = '', dropped = 0;
  let epoch = 0, socket = null, handoff = null, retryTimer = null, retryDelay = 1000, maintenance = null, renewal = null;
  const states = new Map(), seen = new Map(), clients = new Set(), watchdogs = new Map();
  const later = (fn, ms) => { const id = setTimeout(fn, ms); id.unref?.(); return id; };
  const snapshot = () => {
    events = events.filter(event => event.endsAt > now());
    return { donation:{settings:{...donationSettings},audio:{available:Boolean(donationAudio.version),version:donationAudio.version||''}}, settings: { ...settings }, audio: { available: Boolean(audio.version), version: audio.version || '' }, subscription:{settings:{...subscriptionSettings},audio:{available:Boolean(subscriptionAudio.version),version:subscriptionAudio.version||''}}, events: events.map(event => ({ ...event })), serverNow: now() };
  };
  function broadcast() {
    const message = 'data: ' + JSON.stringify(snapshot()) + '\n\n';
    for (const res of clients) { if (res.destroyed || !res.write(message)) { clients.delete(res); res.destroy(); } }
  }
  function remember(id){seen.set(id,now());while(seen.size>500)seen.delete(seen.keys().next().value);}
  function enqueue({ id, name,kind='follow',...metadata }) {
    snapshot();
    if (!['follow','subscription','donation'].includes(kind))return null;
    const selected=profile(kind).settings;
    let paid={};if(kind==='donation'){try{paid=donationData(metadata);}catch{return null;}}if(kind==='subscription'){try{paid=paidData(metadata);}catch{return null;}}
    if (!selected.enabled || typeof id !== 'string' || !id || typeof name !== 'string') return null;
    name = name.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 64).trim();
    if (!name || seen.has(id)) return null;
    remember(id);
    if (events.length >= 30) { dropped++; return null; }
    const startsAt = Math.max(now(), (events.at(-1)?.endsAt || 0) + 500);
    const event = { id: randomBytes(12).toString('base64url'), name, startsAt, endsAt: startsAt + selected.duration * 1000, message: selected.message, motion: selected.motion,kind,...paid };
    events.push(event); broadcast(); return { ...event };
  }
  const donations=createDonationAlerts({read:name=>directory?read(name):{},save,origin,now,fetchImpl,WebSocketImpl,schedule,onDonation:enqueue,onDisconnect(){events=events.filter(event=>event.kind!=='donation');broadcast();}});
  function status() { return {donationalerts:donations.status(),donation:{settings:{...donationSettings},audio:{available:Boolean(donationAudio.version),version:donationAudio.version||'',name:donationAudio.name||''}},subscription:{settings:{...subscriptionSettings},audio:{available:Boolean(subscriptionAudio.version),version:subscriptionAudio.version||'',name:subscriptionAudio.name||''}},subscriptionAuthorized:Boolean(credentials.scopes?.includes(SUB_SCOPE)),subscriptionConnection, settings: { ...settings }, audio: { available: Boolean(audio.version), version: audio.version || '', name: audio.name || '' }, configured: Boolean(credentials.clientId && credentials.clientSecret), clientId: credentials.clientId || '', account: credentials.user?.login || null, connection, error: lastError, dropped, callbackUrl: callbackUrl() }; }
  const callbackUrl = () => `${origin}${origin ? '/obs' : ''}/api/follow/twitch/callback`;
  async function request(url, options) {
    const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(12000) });
    if (!response.ok) { const error = new Error('Twitch временно недоступен.'); error.status = response.status; throw error; }
    return response.json();
  }
  async function identity(token, clientId) {
    const validation = await request('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + token } });
    if (validation.client_id !== clientId || !validation.scopes?.includes(SCOPE)) throw new Error('Нет разрешения на просмотр фоллоу. Подключи Twitch заново.');
    const users = await request('https://api.twitch.tv/helix/users', { headers: { Authorization: 'Bearer ' + token, 'Client-Id': clientId } });
    const user = users.data?.[0];
    if (!user?.id || user.id !== validation.user_id || user.login !== 'ankuzo') throw new Error('Войди в Twitch под аккаунтом ankuzo.');
    return { user: { id: user.id, login: user.login }, expiresAt: now() + Number(validation.expires_in || 3600) * 1000,scopes:validation.scopes.filter(scope=>[SCOPE,SUB_SCOPE].includes(scope)) };
  }
  function dropSockets() {
    clearTimeout(retryTimer); retryTimer = null;
    for (const timer of watchdogs.values()) clearTimeout(timer); watchdogs.clear();
    const old = [socket, handoff]; socket = handoff = null;
    for (const ws of old) { try { ws?.close(); } catch {} }
  }
  function stop() { epoch++; dropSockets(); connection = 'disconnected';subscriptionConnection='disconnected'; }
  async function refresh() {
    if (renewal) return renewal;
    const current = epoch, saved = { ...credentials };
    renewal = (async () => {
      const data = await request(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: saved.refreshToken, client_id: saved.clientId, client_secret: saved.clientSecret }).toString() });
      if (closed || current !== epoch) throw new Error('Подключение изменилось.');
      if (!data.access_token || !data.refresh_token) throw new Error('Подключи Twitch заново.');
      const next = { ...credentials, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: now() + Number(data.expires_in || 3600) * 1000 };
      save('follow-private.json', next); credentials = next;
    })().finally(() => { renewal = null; });
    return renewal;
  }
  function reconnect() {
    if (closed || !credentials.accessToken || retryTimer) return;
    connection = 'reconnecting';
    retryTimer = later(() => { retryTimer = null; openSocket(); }, retryDelay);
    retryDelay = Math.min(30000, retryDelay * 2);
  }
  async function subscribe(ws, sessionId, version) {
    try {
      if (credentials.expiresAt < now() + 60000) await refresh();
      if (version !== epoch || ws !== socket) return;
      const types=['channel.follow',...(credentials.scopes?.includes(SUB_SCOPE)?paidTypes:[])];
      subscriptionConnection=credentials.scopes?.includes(SUB_SCOPE)?'connecting':'reauthorize';
      await Promise.all(types.map(async type=>{
        const body={type,version:type==='channel.follow'?'2':'1',condition:{broadcaster_user_id:credentials.user.id,...(type==='channel.follow'?{moderator_user_id:credentials.user.id}:{})},transport:{method:'websocket',session_id:sessionId}};
        const send=()=>request('https://api.twitch.tv/helix/eventsub/subscriptions',{method:'POST',headers:{Authorization:'Bearer '+credentials.accessToken,'Client-Id':credentials.clientId,'Content-Type':'application/json'},body:JSON.stringify(body)});
        try {await send();}catch(e){
          if(e.status===403&&type!=='channel.follow'){subscriptionConnection='unavailable';return;}
          if(e.status!==401)throw e;
          await refresh();if(version!==epoch)return;await send();
        }
      }));
      if (version === epoch && ws === socket) { connection = 'connected'; if(subscriptionConnection==='connecting')subscriptionConnection='connected';lastError = ''; retryDelay = 1000; }
    } catch { if (version === epoch && ws === socket) { lastError = 'Не удалось подписаться на фоллоу. Переподключаемся…'; ws.close(); } }
  }
  function openSocket(url = WS_URL, transfer = false) {
    if (closed || !credentials.accessToken) return;
    const version = epoch;
    let ws;
    try { ws = new WebSocketImpl(url); } catch { reconnect(); return; }
    if (transfer) handoff = ws; else { socket = ws; connection = 'connecting'; }
    let welcomed = false, timeout = 10000;
    function arm(ms) {
      clearTimeout(watchdogs.get(ws));
      if (schedule) watchdogs.set(ws, later(() => { try { ws.close(); } catch {} }, ms));
    }
    arm(10000);
    ws.addEventListener('message', event => {
      if (closed || version !== epoch || (ws !== socket && ws !== handoff) || typeof event.data !== 'string' || event.data.length > 65536) return;
      let data; try { data = JSON.parse(event.data); } catch { return; }
      const { metadata: meta, payload } = data;
      if (!meta || !payload) return;
      arm(timeout + 5000);
      if (meta.message_type === 'session_welcome' && !welcomed && typeof payload.session?.id === 'string') {
        welcomed = true; timeout = Math.max(10000, Math.min(600000, Number(payload.session.keepalive_timeout_seconds || 10) * 1000)); arm(timeout + 5000);
        if (transfer) {
          const old = socket; socket = ws; handoff = null; connection = 'connected'; lastError = ''; retryDelay = 1000;
          clearTimeout(watchdogs.get(old)); watchdogs.delete(old); old?.close();
        } else void subscribe(ws, payload.session.id, version);
      } else if (meta.message_type === 'notification' && welcomed) {
        const event=payload.event,sub=payload.subscription,type=sub?.type,expected=type==='channel.follow'?'2':'1';
        if((type!=='channel.follow'&&!paidTypes.has(type))||sub.version!==expected||meta.subscription_type!==type||meta.subscription_version!==expected||event?.broadcaster_user_id!==credentials.user?.id||sub.condition?.broadcaster_user_id!==credentials.user?.id||typeof meta.message_id!=='string'||seen.has('msg:'+meta.message_id))return;
        if(type==='channel.follow'){
          if(sub.condition.moderator_user_id!==credentials.user?.id||typeof event.user_id!=='string'||!Number.isFinite(Date.parse(event.followed_at)))return;
          const key=`${event.user_id}:${event.followed_at}`;if(seen.has(key))return;
          remember('msg:'+meta.message_id);enqueue({id:key,name:event.user_name});
        }else{
          if(!credentials.scopes?.includes(SUB_SCOPE)||!['1000','2000','3000'].includes(event.tier))return;
          if(type==='channel.subscribe'&&(event.is_gift!==false||typeof event.user_id!=='string'))return;
          if(type==='channel.subscription.message'&&(typeof event.user_id!=='string'||!Number.isInteger(event.cumulative_months)||event.cumulative_months<2))return;
          if(type==='channel.subscription.gift'&&(typeof event.is_anonymous!=='boolean'||(!event.is_anonymous&&typeof event.user_id!=='string')))return;
          const item={kind:'subscription',id:'paid:'+meta.message_id,name:type==='channel.subscription.gift'&&event.is_anonymous?'Анонимный даритель':event.user_name,eventType:type==='channel.subscription.gift'?'gift':type==='channel.subscription.message'?'resub':'new',tier:event.tier,months:type==='channel.subscription.message'?event.cumulative_months:1,total:type==='channel.subscription.gift'?event.total:1};
          try{paidData(item);}catch{return;}remember('msg:'+meta.message_id);enqueue(item);
        }
      } else if (meta.message_type === 'session_reconnect' && welcomed && ws === socket && !handoff) {
        try {
          const next = new URL(payload.session?.reconnect_url);
          if (next.protocol === 'wss:' && next.hostname === 'eventsub.wss.twitch.tv' && (!next.port || next.port === '443') && next.pathname === '/ws' && !next.username && !next.password && !next.hash) openSocket(next.href, true);
        } catch {}
      } else if (meta.message_type === 'revocation') {
        const next = { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
        try { save('follow-private.json', next); } catch {}
        lastError = 'Twitch отозвал разрешение. Подключи аккаунт заново.'; stop(); credentials = next; connection = 'reauthorize';
      }
    });
    ws.addEventListener('error', () => { try { ws.close(); } catch {} });
    ws.addEventListener('close', () => {
      clearTimeout(watchdogs.get(ws)); watchdogs.delete(ws);
      if (closed || version !== epoch) return;
      if (ws === handoff) { handoff = null; if (!socket) reconnect(); }
      else if (ws === socket) { socket = null; if (!handoff) reconnect(); }
    });
  }
  async function maintain() {
    const version = epoch;
    try {
      if (!credentials.accessToken) return;
      try { const account=await identity(credentials.accessToken,credentials.clientId);if(version===epoch&&!closed){const next={...credentials,...account};save('follow-private.json',next);credentials=next;} }
      catch (error) { if (error.status !== 401) throw error; await refresh(); await identity(credentials.accessToken, credentials.clientId); }
      if (version === epoch && !closed && !socket) openSocket();
    } catch { if (version === epoch) { lastError = 'Проверь подключение Twitch. Повторим попытку автоматически.'; if (!socket) reconnect(); } }
    finally { if (schedule && !closed) maintenance = later(maintain, 3600000); }
  }
  if (schedule && credentials.accessToken) maintenance = later(maintain, 0);

  async function handle(req, res, { pathname, viewer, admin, validMutation, json }) {
    if (!pathname.startsWith('/api/follow/')) return false;
    const route = pathname.slice('/api/follow/'.length);
    if (route === 'audio' && ['GET', 'HEAD'].includes(req.method)) {
      if (!viewer && !admin) { json(res, 401, { error: 'Нужен вход в пульт.' }); return true; }
      try {
        const kind=new URL(req.url,'http://localhost').searchParams.get('kind')||'follow';
        if(!['follow','subscription','donation'].includes(kind)){json(res,400,{error:'Неверный тип оповещения.'});return true;}
        const audio=profile(kind).audio;
        if (!audio.version) { json(res, 404, { error: 'Звук не загружен.' }); return true; }
        const bytes = directory ? fs.readFileSync(path.join(directory, kind+'-audio.bin')) : kind==='donation'?donationBytes:kind==='subscription'?subscriptionBytes:audioBytes;
        let start = 0, finish = bytes.length - 1, code = 200;
        if (req.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); res.end(); return true; }
          start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
          finish = match[1] && match[2] ? Math.min(finish, Number(match[2])) : finish;
          if (start > finish || start >= bytes.length) { res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); res.end(); return true; }
          code = 206;
        }
        res.writeHead(code, { 'Content-Type': audio.mime, 'Content-Length': finish - start + 1, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', ...(code === 206 ? { 'Content-Range': `bytes ${start}-${finish}/${bytes.length}` } : {}) });
        res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, finish + 1));
      } catch { json(res, 404, { error: 'Звук недоступен. Загрузи его заново в пульте.' }); }
      return true;
    }
    if (route === 'stream' && ['GET', 'HEAD'].includes(req.method)) {
      if (!viewer && !admin) { json(res, 401, { error: 'Нужен вход в пульт.' }); return true; }
      if (clients.size >= 20) { json(res, 503, { error: 'Слишком много подключений.' }); return true; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      if (req.method === 'HEAD') { res.end(); return true; }
      res.flushHeaders(); clients.add(res); res.write('retry: 3000\ndata: ' + JSON.stringify(snapshot()) + '\n\n');
      const heartbeat = setInterval(() => { if (!res.write(': heartbeat\n\n')) res.destroy(); }, 15000); heartbeat.unref?.();
      res.on('close', () => { clearInterval(heartbeat); clients.delete(res); }); return true;
    }
    if (viewer || !admin) { json(res, viewer ? 403 : 401, { error: 'Нужен вход в пульт.' }); return true; }
    if (req.method === 'POST' && !validMutation()) { json(res, 403, { error: 'Используй пульт для изменений.' }); return true; }
    try {
      let body;
      if (req.method === 'POST') {
        const limit = route === 'audio' ? 7 * 1024 * 1024 : 8192;
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > limit) { json(res, 413, { error: 'Слишком большой запрос.' }); return true; } }
        try { body = JSON.parse(raw); } catch { throw new Error('Неверный JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Неверный запрос.');
      }
      if(await donations.handle(route,req,res,body,json))return true;
      const kind=body?.kind??'follow';
      if(!['follow','subscription','donation'].includes(kind))throw new Error('Неверный тип оповещения.');
      const selected=profile(kind);
      if (route === 'status' && req.method === 'GET') json(res, 200, status());
      else if (route === 'audio' && req.method === 'POST') {
        if (body.remove === true) {
          save(kind+'-audio.json', {});if(kind==='donation'){donationAudio={};donationBytes=null;}else if(kind==='subscription'){subscriptionAudio={};subscriptionBytes=null;}else{audio={};audioBytes=null;}
          if (directory) { try { fs.unlinkSync(path.join(directory, kind+'-audio.bin')); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
        } else {
          if (typeof body.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data) || body.data.length % 4) throw new Error('Неверный аудиофайл.');
          const bytes = Buffer.from(body.data, 'base64');
          if (bytes.length < 44 || bytes.length > 5 * 1024 * 1024) throw new Error('Размер звука: до 5 МБ.');
          let mime;
          if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') mime = 'audio/wav';
          else if (bytes.toString('ascii', 0, 4) === 'OggS') mime = 'audio/ogg';
          else if (bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224)) mime = 'audio/mpeg';
          else throw new Error('Поддерживаются MP3, WAV и OGG.');
          const next = { mime, name: String(body.name || 'Оповещение').replace(/[\x00-\x1f/\\]/g, '').slice(0, 120), version: randomBytes(12).toString('base64url') };
          if (directory) {
            const file = path.join(directory, kind+'-audio.bin'), temp = file + '.tmp';
            fs.writeFileSync(temp, bytes, { mode: 0o600 }); fs.renameSync(temp, file);
          } else if(kind==='donation')donationBytes=bytes;else if(kind==='subscription')subscriptionBytes=bytes;else audioBytes=bytes;
          save(kind+'-audio.json',next);if(kind==='donation')donationAudio=next;else if(kind==='subscription')subscriptionAudio=next;else audio=next;
        }
        broadcast(); json(res, 200, status());
      }
      else if (route === 'settings' && req.method === 'POST') {
        const {kind:ignored,...input}=body;const next=validateSettings(input,selected.settings);save(kind+'-settings.json',next);if(kind==='donation')donationSettings=next;else if(kind==='subscription')subscriptionSettings=next;else settings=next;
        if(!next.enabled)events=events.filter(event=>event.kind!==kind); broadcast(); json(res, 200, status());
      } else if (route === 'test' && req.method === 'POST') {
        if (!selected.settings.enabled) throw new Error('Сначала включи оповещения.');
        const metadata=kind==='donation'?donationData(body):kind==='subscription'?paidData(body):{};
        const event = enqueue({kind,...metadata, id: 'test:' + randomBytes(16).toString('hex'), name: typeof body.name === 'string' ? body.name : 'Новый_зритель' });
        if (!event) throw new Error('Очередь заполнена.'); json(res, 200, { queued: true });
      } else if (route === 'twitch/app' && req.method === 'POST') {
        if (typeof body.clientId !== 'string' || !/^[a-zA-Z0-9]{8,100}$/.test(body.clientId) || typeof body.clientSecret !== 'string' || !/^[a-zA-Z0-9_-]{8,200}$/.test(body.clientSecret)) throw new Error('Проверь Client ID и Client Secret.');
        const next = { clientId: body.clientId, clientSecret: body.clientSecret };
        save('follow-private.json', next); stop(); credentials = next; states.clear(); lastError = ''; json(res, 200, status());
      } else if (route === 'twitch/connect' && req.method === 'GET') {
        if (!credentials.clientSecret) throw new Error('Сначала сохрани приложение Twitch.');
        for (const [key, value] of states) if (value.expiresAt < now()) states.delete(key);
        while (states.size >= 20) states.delete(states.keys().next().value);
        const state = randomBytes(32).toString('base64url'); states.set(state, { expiresAt: now() + 600000, epoch });
        const url = new URL('https://id.twitch.tv/oauth2/authorize');
        url.search = new URLSearchParams({ response_type: 'code', client_id: credentials.clientId, redirect_uri: callbackUrl(), scope: SCOPE+' '+SUB_SCOPE, state, force_verify: 'true' }).toString();
        res.writeHead(302, { Location: url.href, 'Cache-Control': 'no-store' }); res.end();
      } else if (route === 'twitch/callback' && req.method === 'GET') {
        const params = new URL(req.url, 'http://localhost').searchParams, key = params.get('state'), state = states.get(key); states.delete(key);
        if (!state || state.expiresAt < now() || state.epoch !== epoch) throw new Error('Ссылка подключения истекла. Вернись в пульт и подключи Twitch заново.');
        const code = params.get('code'); if (params.has('error') || !code || code.length > 1000) throw new Error('Подключение отменено. Вернись в пульт.');
        const current = epoch;
        const tokens = await request(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: credentials.clientId, client_secret: credentials.clientSecret, code, redirect_uri: callbackUrl() }).toString() });
        if (!tokens.access_token || !tokens.refresh_token) throw new Error('Twitch не выдал разрешение. Попробуй подключиться заново.');
        const account = await identity(tokens.access_token, credentials.clientId);
        if (current !== epoch || closed) throw new Error('Настройки подключения изменились. Попробуй снова.');
        const next = { ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, ...account };
        save('follow-private.json', next); stop(); credentials = next; states.clear(); lastError = ''; openSocket();
        if (schedule && !maintenance) maintenance = later(maintain, 3600000);
        res.writeHead(303, { Location: `${origin ? '/obs' : ''}/follow-control.html?connected=1`, 'Cache-Control': 'no-store' }); res.end();
      } else if (route === 'twitch/disconnect' && req.method === 'POST') {
        const next = { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
        save('follow-private.json', next); stop(); credentials = next; states.clear(); events = events.filter(event=>event.kind==='donation'); broadcast(); json(res, 200, status());
      } else json(res, 404, { error: 'Неизвестный запрос.' });
    } catch (error) {
      const safe = !error.status && /^[А-ЯЁ]/.test(error.message) ? error.message : 'Не удалось выполнить запрос. Вернись в пульт и попробуй снова.';
      if (route === 'twitch/callback'||route==='donationalerts/callback') {
        const prefix = origin ? '/obs' : '';
        const escaped = safe.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Подключение оповещений</title><link rel="stylesheet" href="${prefix}/control.css"><main class="workspace"><section class="controls"><h1>Подключение оповещений</h1><p>${escaped}</p><a class="scene-link" href="${prefix}/follow-control.html">Вернуться в пульт ↗</a></section></main></html>`);
      } else json(res, 400, { error: safe });
    }
    return true;
  }
  function close() { if (closed) return; closed = true; stop(); donations.close(); clearTimeout(maintenance); for (const res of clients) res.end(); clients.clear(); states.clear(); }
  return { enqueue, snapshot, handle, close };
}
module.exports = { createFollow };
