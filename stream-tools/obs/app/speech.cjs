'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const { equalSecret } = require('./obs-access.cjs');

// Exact ASR confusions reported by the Russian-speaking operator. Never
// rewrite a substring or euphemism (e.g. «писец» is also an animal).
const recognitionFixes = new Map([['пидец', 'пиздец'], ['охлительно', 'охуительно'], ['ахуительно', 'охуительно']]);
function normalizeRecognition(text) {
  return String(text).replace(/[а-яё]+/giu, word => {
    const replacement = recognitionFixes.get(word.toLowerCase());
    if (!replacement) return word;
    if (word === word.toUpperCase()) return replacement.toUpperCase();
    return word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  });
}

// Match complete Russian tokens with productive obscene stems; do not match
// harmless substrings such as «страхуй», «подстрахуй», «хулиган», «рубля».
function profanityWords(text) {
  const tokens = normalizeRecognition(text).toLowerCase().replaceAll('ё', 'е').match(/[а-я]+/gu) || [];
  const obscene = /^(?:(?:на|по|за|от|до|про|вы|с|об|под|при|раз|рас|пере|недо|у|в)?[ъь]?(?:еб|еба|ебл|ебн|ебу|еби|ебо|ебы|ебе)[а-я]*|(?:на|по|за|от|до|про|вы|с|об|под|при|раз|пере|у|в|о)?(?:пизд|хуе|хуй|хуя|хуи)[а-я]*|бля(?:д[а-я]*|т[а-я]*)?|сука|суки|суке|суку|сукой|сукою|суч[а-я]*|мудак[а-я]*|мудил[а-я]*|долбо[её]б[а-я]*|залуп[а-я]*|гандон[а-я]*|говно[а-я]*|хер(?:а|у|ом|ня|ни|ню|ней|нейший)?|нахрен|охрен[а-я]*)$/u;
  const ordinaryWebWord = /^веб(?:ка|ки|ке|ку|кой|кам|ками|ках|камера[а-я]*|мастер[а-я]*|сайт[а-я]*|дизайн[а-я]*|разработ[а-я]*)?$/u;
  return tokens.filter(word => !ordinaryWebWord.test(word) && obscene.test(word));
}

class SpeechError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new SpeechError(status, message); };
async function readBody(req, max) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) fail(413, 'Слишком большой фрагмент звука.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function normalizeRules(input = {}) {
  const number = (key, fallback, min, max) => {
    const value = input[key] ?? fallback;
    if (!Number.isInteger(value) || value < min || value > max) fail(400, 'Проверь порог и время: нужны целые числа в указанных пределах.');
    return value;
  };
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') fail(400, 'Некорректный переключатель реакции.');
  if (input.showCounter !== undefined && typeof input.showCounter !== 'boolean') fail(400, 'Некорректный переключатель счётчика.');
  return { enabled: input.enabled ?? true, showCounter: input.showCounter ?? true,
    threshold: number('threshold', 5, 2, 30), windowSeconds: number('windowSeconds', 15, 5, 120),
    cooldownSeconds: number('cooldownSeconds', 30, 10, 600), durationSeconds: number('durationSeconds', 5, 2, 20) };
}

function createSpeech({ file = null, now = Date.now, workerUrl = process.env.ANKUZO_SPEECH_URL || 'http://ankuzo-speech-accuracy:17223', transcribe = null } = {}) {
  let saved = {};
  if (file) { try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  let state = { count: Number.isSafeInteger(saved.count) ? saved.count : 0, rules: normalizeRules(saved.rules), events: Array.isArray(saved.events) ? saved.events.slice(0, 100) : [] };
  let session = null, processing = false, recent = [], trigger = null, lastTriggerAt = -Infinity, lastText = '', lastMetrics = null;
  let health = { ready: false, failed: false }, healthAt = -Infinity;
  function commit(next) {
    if (file) {
      fs.writeFileSync(file + '.tmp', JSON.stringify(next), { mode: 0o600 });
      fs.renameSync(file + '.tmp', file);
    }
    state = next;
  }
  const active = () => Boolean(session && session.expires > now());
  const overlay = () => ({ count: state.count, showCounter: state.rules.showCounter, trigger: trigger && trigger.until > now() ? trigger : null, serverNow: now() });
  const snapshot = () => ({ ...state, ...overlay(), active: active(), processing, health, lastText, lastMetrics });
  async function checkHealth() {
    if (transcribe) { health = { ready: true, failed: false }; return; }
    if (now() - healthAt < 5000) return;
    healthAt = now();
    try {
      const response = await fetch(workerUrl + '/health', { signal: AbortSignal.timeout(2500) });
      health = response.ok ? await response.json() : { ready: false, failed: true };
    } catch { health = { ready: false, failed: true }; }
  }
  function producer(req) {
    if (!active() || !equalSecret(req.headers['x-ankuzo-speech-session'] || '', session.id)) fail(409, 'Подключение микрофона завершилось. Нажми «Подключить микрофон» ещё раз.');
    session.expires = now() + 30000;
    return session;
  }
  async function handle(req, res, { pathname, viewer, admin, controlKey, origin, json }) {
    if (!pathname.startsWith('/api/speech')) return false;
    try {
      if (pathname === '/api/speech-overlay' && ['GET', 'HEAD'].includes(req.method)) { json(res, 200, overlay()); return true; }
      if (viewer || (controlKey && !admin)) fail(403, 'Управление доступно только в пульте.');
      if (pathname === '/api/speech/state' && req.method === 'GET') {
        await checkHealth(); json(res, 200, snapshot()); return true;
      }
      if (req.method !== 'POST') fail(405, 'Метод не поддерживается.');
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers['x-ankuzo-control'] !== '1') fail(403, 'Открой пульт на своём сайте.');
      if (pathname === '/api/speech/audio') {
        if (String(req.headers['content-type']).split(';')[0] !== 'application/octet-stream') fail(415, 'Нужен звук PCM16.');
        const current = producer(req);
        const sequence = Number(req.headers['x-audio-sequence']), startMs = Number(req.headers['x-audio-start']);
        if (!Number.isSafeInteger(sequence) || sequence < 0 || !Number.isFinite(startMs) || startMs < 0 || startMs > now() - current.startedAt + 5000) fail(400, 'Некорректное время аудиофрагмента.');
        const audio = await readBody(req, 320000);
        if (audio.length < 3200 || audio.length % 2) fail(400, 'Слишком короткий аудиофрагмент.');
        if (sequence <= current.sequence) { json(res, 200, snapshot()); return true; }
        if (processing) fail(429, 'Сервер обрабатывает предыдущую фразу.');
        processing = true;
        try {
          let result;
          if (transcribe) result = await transcribe(audio);
          else {
            const response = await fetch(workerUrl + '/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: audio, signal: AbortSignal.timeout(25000) });
            if (!response.ok) fail(503, 'Распознавание временно недоступно. Повтори подключение.');
            result = await response.json();
          }
          if (current !== session) fail(409, 'Подключение микрофона изменилось.');
          const matches = [], spans = []; let lastEnd = current.wordEnd;
          for (const word of result.words || []) {
            const start = startMs + word.start * 1000, end = startMs + word.end * 1000;
            if (!Number.isFinite(start) || !Number.isFinite(end) || word.probability < 0.25) continue;
            const token = normalizeRecognition(word.word).toLowerCase().replaceAll('ё', 'е').replace(/[^а-я]/gu, '');
            const duplicate = current.words.some(previous => previous.token === token && Math.min(previous.end, end) - Math.max(previous.start, start) > 0.4 * Math.min(previous.end - previous.start, end - start));
            spans.push({token, start, end});
            if (end <= current.wordEnd + 40 || duplicate) continue;
            lastEnd = Math.max(lastEnd, end);
            for (const token of profanityWords(word.word)) matches.push({ word: token, at: current.startedAt + end });
          }
          if (matches.length) {
            const event = { id: crypto.randomUUID(), at: now(), words: matches.map(m => m.word), added: matches.length };
            commit({ ...state, count: state.count + matches.length, events: [event, ...state.events].slice(0, 100) });
            const captureNow = Math.max(...matches.map(m => m.at));
            recent = [...recent, ...matches.map(m => m.at)].filter(at => at > captureNow - state.rules.windowSeconds * 1000);
            if (state.rules.enabled && recent.length >= state.rules.threshold && now() - captureNow < 30000 && now() - lastTriggerAt >= state.rules.cooldownSeconds * 1000) {
              trigger = { id: crypto.randomUUID(), until: now() + state.rules.durationSeconds * 1000 };
              lastTriggerAt = now(); recent = [];
            }
          }
          current.sequence = sequence; current.wordEnd = lastEnd; current.words = [...current.words, ...spans].slice(-50); current.expires = now() + 30000;
          lastText = normalizeRecognition(result.text || '').slice(0, 600);
          const corrections = [...new Set(String(result.text || '').toLowerCase().match(/[а-яё]+/gu) || [])].filter(word => recognitionFixes.has(word)).map(word => ({ heard: word, corrected: recognitionFixes.get(word) }));
          lastMetrics = { processingMs: result.processingMs, audioMs: Math.round(audio.length / 32), receivedAt: now(), corrections };
          json(res, 200, snapshot());
        } finally { processing = false; }
        return true;
      }
      if (!String(req.headers['content-type']).startsWith('application/json')) fail(415, 'Нужен JSON.');
      let body;
      try { body = JSON.parse((await readBody(req, 4096)).toString()); } catch (error) { if (error.status) throw error; fail(400, 'Некорректные настройки.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Некорректные настройки.');
      if (pathname === '/api/speech/start') {
        if (active() || processing) fail(409, 'Микрофон уже подключён в другой вкладке. Останови его там или подожди 30 секунд после закрытия.');
        await checkHealth();
        if (!health.ready && !transcribe) fail(503, 'Модель речи ещё не готова. Подожди и повтори.');
        session = { id: crypto.randomBytes(24).toString('base64url'), startedAt: now(), expires: now() + 30000, sequence: -1, wordEnd: -Infinity, words: [] };
        recent = []; lastText = ''; json(res, 200, { ...snapshot(), session: session.id }); return true;
      }
      if (pathname === '/api/speech/heartbeat') { producer(req); json(res, 200, { active: true }); return true; }
      if (pathname === '/api/speech/stop') { producer(req); session = null; recent = []; json(res, 200, snapshot()); return true; }
      if (pathname === '/api/speech/rules') { commit({ ...state, rules: normalizeRules(body) }); recent = []; json(res, 200, snapshot()); return true; }
      if (pathname === '/api/speech/reset') {
        if (active() || processing) fail(409, 'Сначала останови микрофон.');
        commit({ ...state, count: 0, events: [] }); recent = []; trigger = null; lastText = ''; lastMetrics = null;
        json(res, 200, snapshot()); return true;
      }
      fail(404, 'Раздел не найден.');
    } catch (error) {
      json(res, error.status || 503, { error: error.status ? error.message : 'Не удалось обработать звук или сохранить счётчик. Останови микрофон и повтори.' });
    }
    return true;
  }
  return { handle, snapshot, overlay };
}
module.exports = { createSpeech, profanityWords, normalizeRules, normalizeRecognition };
