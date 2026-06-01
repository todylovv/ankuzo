const https = require('https');

const PORT = process.env.PORT || 3000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Content-Type': 'application/json',
};

function normalizeCover(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^https?:\/\//, '').replace(/^\/\//, '');
  if (cleaned.includes('%%')) return 'https://' + cleaned.replace('%%', '400x400');
  if (raw.startsWith('http')) return raw;
  return 'https://' + cleaned;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Yandex-Music-API',
        'Accept': 'application/json',
        'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

require('http').createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const rawUrl = urlObj.searchParams.get('url');

  if (!rawUrl) {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: 'Missing ?url parameter' }));
    return;
  }

  const p = new URL(rawUrl).pathname;
  const userMatch = p.match(/^\/users\/([^/]+)\/playlists\/(\d+)/);
  const shortMatch = p.match(/^\/playlist\/([^/]+)\/(\d+)/);
  const match = userMatch ?? shortMatch;

  if (!match) {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: 'Could not parse URL' }));
    return;
  }

  const uid = match[1];
  const kind = match[2];
  const embedUrl = `https://music.yandex.ru/iframe/#playlist/${uid}/${kind}`;
  const canonicalUrl = `https://music.yandex.ru/users/${uid}/playlists/${kind}`;

  try {
    const result = await fetchUrl(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`);
    
    if (result.status === 200) {
      const data = JSON.parse(result.body);
      const pl = data?.result ?? data;
      
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        ok: true,
        title: pl.title ?? pl.name ?? 'Плейлист',
        author: pl.owner?.name ?? pl.owner?.login ?? uid,
        cover_url: normalizeCover(pl.cover?.uri ?? pl.ogImage ?? null),
        track_count: pl.trackCount ?? pl.tracks?.length ?? 0,
        playlist_url: canonicalUrl,
        embed_url: embedUrl,
      }));
    } else {
      res.writeHead(200, CORS);
      res.end(JSON.stringify({
        ok: false,
        error: `Yandex returned ${result.status}`,
        title: null, author: null, cover_url: null, track_count: 0,
        playlist_url: canonicalUrl, embed_url: embedUrl,
      }));
    }
  } catch (e) {
    res.writeHead(200, CORS);
    res.end(JSON.stringify({
      ok: false, error: e.message,
      title: null, author: null, cover_url: null, track_count: 0,
      playlist_url: canonicalUrl, embed_url: embedUrl,
    }));
  }
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));
