'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createViewerAccess, equalSecret } = require('./obs-access.cjs');
const { Countdown, normalizeSettings } = require('./timer.js');
const { createTwitchChat } = require('./twitch-chat.cjs');
const { createSpeech } = require('./speech.cjs');
const { createFollow } = require('./follow.cjs');
const ROOT = __dirname;
const SETTINGS_FILE = process.env.ANKUZO_SETTINGS_FILE || path.join(ROOT, 'settings.json');
const publicFiles = new Map([
  ['/', ['control.html', 'text/html']], ['/control.html', ['control.html', 'text/html']],
  ['/scene.html', ['scene.html', 'text/html']], ['/scene.css', ['scene.css', 'text/css']],
  ['/break.html', ['break.html', 'text/html']], ['/break.css', ['break.css', 'text/css']],
  ['/overlay.html', ['overlay.html', 'text/html']], ['/overlay.css', ['overlay.css', 'text/css']], ['/overlay.js', ['overlay.js', 'text/javascript']],
  ['/mapcover.html',['mapcover.html','text/html']],['/mapcover.css',['mapcover.css','text/css']],['/mapcover.js',['mapcover.js','text/javascript']],
  ['/layout.html', ['layout.html', 'text/html']], ['/layout.css', ['layout.css', 'text/css']], ['/layout.js', ['layout.js', 'text/javascript']],
  ['/scene.js', ['scene.js', 'text/javascript']], ['/control.css', ['control.css', 'text/css']],
  ['/smoke.js', ['smoke.js', 'text/javascript']],
  ['/control.js', ['control.js', 'text/javascript']], ['/timer.js', ['timer.js', 'text/javascript']],
  ['/speech-control.js', ['speech-control.js', 'text/javascript']], ['/speech.css', ['speech.css', 'text/css']],
  ['/mic-worklet.js', ['mic-worklet.js', 'text/javascript']], ['/rage.html', ['rage.html', 'text/html']],
  ['/rage.js', ['rage.js', 'text/javascript']], ['/rage.css', ['rage.css', 'text/css']],
]);
for (const [name, type] of [
  ['donation-seal-v1.webp','image/webp'], ['head.png', 'image/png'], ['backstage.png', 'image/png'], ['atmosphere.png', 'image/png'], ['card-back-display-v1.webp', 'image/webp'], ['mapcover-seal-v1.png','image/png'],['mapcover-seal-circle-v1.png','image/png'],
  ['bodoni-0.woff2', 'font/woff2'], ['bodoni-1.woff2', 'font/woff2'],
  ['onest-cyrillic.woff2', 'font/woff2'], ['onest-latin.woff2', 'font/woff2'],
]) publicFiles.set('/assets/' + name, ['assets/' + name, type]);

for (const name of ['follow.html','follow.css','follow.js','follow-control.html','follow-control.css','follow-control.js']) publicFiles.set('/'+name,[name,name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript']);

const viewerFiles = new Set(['/scene.html', '/scene.css', '/break.html', '/break.css', '/overlay.html', '/overlay.css', '/overlay.js', '/mapcover.html','/mapcover.css','/mapcover.js','/scene.js', '/smoke.js', '/timer.js',
  '/rage.html', '/rage.js', '/rage.css', '/follow.html', '/follow.css', '/follow.js',
  ...[...publicFiles.keys()].filter(name => name.startsWith('/assets/'))]);

function createServer({ persist = true, controlKey = process.env.ANKUZO_CONTROL_KEY || '', publicHost = process.env.ANKUZO_PUBLIC_HOST || '', publicOrigin = process.env.ANKUZO_PUBLIC_ORIGIN || '', edgeAuth = process.env.ANKUZO_EDGE_AUTH === '1', settingsFile = SETTINGS_FILE, accessFile = persist ? path.join(path.dirname(settingsFile), 'obs-access.json') : null, now = Date.now, chatFeed = createTwitchChat({now}), followService } = {}) {
  const viewerAccess = createViewerAccess(accessFile);
  const follow = followService || createFollow({directory:persist?path.dirname(settingsFile):null,origin:publicOrigin,now,schedule:persist});
  const speech = createSpeech({ file: persist ? path.join(path.dirname(settingsFile), 'speech-state.json') : null, now });
  let saved = {};
  if (persist) {
    try { saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') console.warn('Settings could not be read; using defaults.'); }
  }
  const makeProfile = (value, scene) => {
    const settings = normalizeSettings(value, scene);
    return { settings, timer: new Countdown(settings.minutes * 60, now), revision: 0, appearanceEpoch: now() };
  };
  const profiles = { starting: makeProfile(saved, 'starting'), break: makeProfile(saved?.break, 'break'), overlay: makeProfile(saved?.overlay, 'overlay'),mapcover:makeProfile(saved?.mapcover,'mapcover') };
  const scenePages = { starting: 'scene.html', break: 'break.html', overlay: 'overlay.html',mapcover:'mapcover.html', rage: 'rage.html', follow: 'follow.html' };
  const snapshot = (scene = 'starting') => {
    const { settings, timer, revision } = profiles[scene];
    const time = now();
    let appearance;
    if (scene === 'overlay') {
      appearance = { visible: settings.overlayVisible, nextChangeAt: null };
      if (settings.overlayVisible && settings.appearanceMode === 'periodic') {
        const interval = settings.intervalSeconds * 1000, duration = settings.visibleSeconds * 1000;
        const elapsed = Math.max(0, time - profiles.overlay.appearanceEpoch), phase = elapsed % interval;
        appearance = { visible: phase < duration, nextChangeAt: time + (phase < duration ? duration - phase : interval - phase) };
      }
    }
    return { scene, settings, revision, ...(appearance ? { appearance } : {}), requiresControlKey: Boolean(controlKey) && !edgeAuth, serverNow: time, timer: {
    remainingMs: timer.milliseconds, endAt: timer.deadline,
    running: !timer.paused && !timer.finished, finished: timer.finished,
    } };
  };
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
    const host = publicHost || `127.0.0.1:${res.socket.localPort}`;
    if (req.headers.host !== host) return json(res, 403, { error: 'Use the local 127.0.0.1 address.' });
    const requestUrl = new URL(req.url, `http://${host}`);
    let pathname = requestUrl.pathname;
    res.setHeader('Permissions-Policy', ['/', '/control.html'].includes(pathname) ? 'camera=(), microphone=(self), geolocation=()' : 'camera=(), microphone=(), geolocation=()');
    const scene = requestUrl.searchParams.get('scene') || 'starting';
    const admin = controlKey && equalSecret(String(req.headers.authorization || '').replace(/^Bearer /, ''), controlKey);
    const viewer = pathname.startsWith('/view/');
    if (viewer) {
      const match = pathname.match(/^\/view\/([A-Za-z0-9_-]{43})(\/.*)$/);
      if (!match || !viewerAccess.accepts(match[1])) return json(res, 401, { error: 'OBS link is invalid or has been replaced.' });
      pathname = match[2];
      if (!['GET', 'HEAD'].includes(req.method) || !(viewerFiles.has(pathname) || pathname === '/api/state' || pathname === '/api/chat' || pathname === '/api/speech-overlay' || pathname === '/api/follow/stream' || pathname === '/api/follow/audio' || pathname==='/api/follow/voice')) {
        return json(res, 403, { error: 'This link only allows viewing the scene.' });
      }
    } else if ((edgeAuth || pathname === '/api/obs-link') && !admin) {
      return json(res, 401, { error: 'Administrator login required.' });
    }
    const validMutation = () => (!req.headers.origin || req.headers.origin === (publicOrigin || `http://${host}`)) &&
      req.headers['x-ankuzo-control'] === '1' && String(req.headers['content-type']).startsWith('application/json');
    if (await follow.handle(req,res,{pathname,viewer,admin,validMutation,json})) return;
    if (await speech.handle(req, res, { pathname, viewer, admin, controlKey, origin: publicOrigin || `http://${host}`, json })) return;
    if(pathname==='/api/chat'&&['GET','HEAD'].includes(req.method)){chatFeed.start();return json(res,200,chatFeed.snapshot());}
    if (pathname === '/api/obs-link' && ['GET', 'POST'].includes(req.method)) {
      if (!Object.hasOwn(scenePages, scene)) return json(res, 400, { error: 'Unknown scene.' });
      if (req.method === 'POST') {
        if (!validMutation()) return json(res, 403, { error: 'Use the control panel to replace the link.' });
        try { viewerAccess.replace(); }
        catch { return json(res, 500, { error: 'Could not save the new link. The current link is still valid.' }); }
      }
      const origin = publicOrigin || `http://${host}`;
      return json(res, 200, { url: `${origin}${publicOrigin ? '/obs' : ''}/view/${viewerAccess.token}/${scenePages[scene]}` });
    }
    if (['GET', 'HEAD'].includes(req.method) && pathname === '/api/state') {
      if (!Object.hasOwn(profiles, scene)) return json(res, 400, { error: 'Unknown scene.' });
      const state = snapshot(scene);
      if (viewer) delete state.requiresControlKey;
      return json(res, 200, state);
    }
    if (pathname === '/api/control' && req.method === 'POST') {
      if (!validMutation()) {
        return json(res, 403, { error: 'Only the local control panel can change this scene.' });
      }
      if (controlKey && !admin) return json(res, 401, { error: 'Administrator login required.' });
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 8192) { json(res, 413, { error: 'Request is too large.' }); return; }
        }
        let command;
        try { command = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON.' }); }
        if (!command || typeof command !== 'object') return json(res, 400, { error: 'Invalid command.' });
        const target = command.scene === undefined ? 'starting' : command.scene;
        if (typeof target !== 'string' || !Object.hasOwn(profiles, target)) return json(res, 400, { error: 'Unknown scene.' });
        const profile = profiles[target];
        if (['overlay','mapcover'].includes(target) && command.action !== 'settings') return json(res, 400, { error: 'This widget has no countdown. Use its appearance settings.' });
        const { settings, timer } = profile;
        if (!['settings', 'start', 'pause', 'reset', 'add', 'visibility'].includes(command.action)) {
          return json(res, 400, { error: 'Unknown command.' });
        }
        const next = normalizeSettings({ ...settings,
          ...(command.action === 'settings' ? command.settings : {}),
          ...(command.action === 'start' ? { showTimer: true } : {}),
          ...(command.action === 'visibility' ? { showTimer: command.visible === true } : {}),
        }, target);
        if (persist && JSON.stringify(next) !== JSON.stringify(settings)) {
          const temp = settingsFile + '.tmp';
          const startSettings = target === 'starting' ? next : profiles.starting.settings;
          const breakSettings = target === 'break' ? next : profiles.break.settings;
          const overlaySettings = target === 'overlay' ? next : profiles.overlay.settings;
          const mapcoverSettings = target === 'mapcover' ? next : profiles.mapcover.settings;
          fs.writeFileSync(temp, JSON.stringify({ ...startSettings, break: breakSettings, overlay: overlaySettings,mapcover:mapcoverSettings }, null, 2) + '\n', 'utf8');
          fs.renameSync(temp, settingsFile);
        }
        const durationChanged = settings.minutes !== next.minutes;
        if (target === 'overlay' && (settings.appearanceMode !== next.appearanceMode || settings.intervalSeconds !== next.intervalSeconds || settings.visibleSeconds !== next.visibleSeconds || (!settings.overlayVisible && next.overlayVisible))) profile.appearanceEpoch = now();
        profile.settings = next;
        if (durationChanged || command.action === 'reset') timer.reset(next.minutes * 60);
        if (command.action === 'start') {
          if (timer.finished) timer.reset(next.minutes * 60);
          timer.start();
        }
        if (command.action === 'pause' && !timer.paused) timer.toggle();
        if (command.action === 'add') timer.add(60);
        profile.revision += 1;
        return json(res, 200, snapshot(target));
      } catch (error) {
        console.error('Control request failed:', error.message);
        if (!res.headersSent) return json(res, 500, { error: 'Could not save settings. Check folder permissions.' });
        return;
      }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    const file = publicFiles.get(pathname);
    if (!file) return json(res, 404, { error: 'Not found.' });
    try {
      const bytes = await fs.promises.readFile(path.join(ROOT, file[0]));
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': viewer ? 'no-store' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { json(res, 404, { error: 'Asset not found.' }); }
  });
  server.on('close',()=>{chatFeed.close();follow.close();});
  return server;
}
if (require.main === module) {
  const listenHost = process.env.ANKUZO_LISTEN || '127.0.0.1';
  const port = Number(process.env.ANKUZO_PORT || 17222);
  if (listenHost !== '127.0.0.1' && !process.env.ANKUZO_CONTROL_KEY) {
    console.error('Remote control requires ANKUZO_CONTROL_KEY.');
    process.exit(1);
  }
  const server = createServer();
  const openPanel = () => {
    if (process.argv.includes('--open')) require('node:child_process').execFile(
      'explorer.exe', ['http://127.0.0.1:17222/'], { windowsHide: true }, () => {}
    );
  };
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Port 17222 is already in use. If Ankuzo is running, open http://127.0.0.1:17222/ in your browser.'
      : error.message);
    if (error.code === 'EADDRINUSE') openPanel();
    process.exitCode = 1;
  });
  server.listen(port, listenHost, () => { openPanel(); console.log(
    '\n ANKUZO / STARTING SCENE\n\n Control: http://127.0.0.1:17222/\n OBS URL: http://127.0.0.1:17222/scene.html\n Size: 1920 x 1080 | 60 FPS\n\n Keep this window open while streaming. Ctrl+C to stop.\n'
  ); });
}
module.exports = { createServer };
