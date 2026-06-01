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

function fetchUrl(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html',
        'Accept-Language': 'ru-RU,ru;q=0.9',
        'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231',
        'Referer': 'https://music.yandex.ru/',
        ...extraHeaders,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseOgTags(html) {
  const title = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] ?? '';
  const coverUrl = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
  const desc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] ?? '';
  const trackCount = parseInt(desc.match(/(\d+)\s+тре/i)?.[1] ?? '0', 10);
  const author = desc.match(/пользователя\s+(.+?)(\s*·|\s*$)/i)?.[1]
    ?? desc.match(/от\s+(.+?)(\s*·|\s*$)/i)?.[1]
    ?? '';
  return {
    title: title.replace(' — Яндекс Музыка', '').trim(),
    author: author.trim(),
    cover_url: normalizeCover(coverUrl),
    track_count: trackCount,
  };
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

  let parsedUrl;
  try { parsedUrl = new URL(rawUrl); } catch {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: 'Invalid URL' }));
    return;
  }

  const p = parsedUrl.pathname;

  // UUID playlist: /playlists/<uuid>
  const uuidMatch = p.match(/^\/playlists?\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i);

  // User playlist: /users/<uid>/playlists/<kind>
  const userMatch = p.match(/^\/users\/([^/]+)\/playlists\/(\d+)/) ?? p.match(/^\/playlist\/([^/]+)\/(\d+)/);

  if (!uuidMatch && !userMatch) {
    res.writeHead(400, CORS);
    res.end(JSON.stringify({ error: 'Could not parse URL' }));
    return;
  }

  try {
    let result;

    if (uuidMatch) {
      const uuid = uuidMatch[1];
      const embedUrl = `https://music.yandex.ru/iframe/playlist/${uuid}`;
      const canonicalUrl = `https://music.yandex.ru/playlists/${uuid}`;

      // Try iframe page
      const r = await fetchUrl(embedUrl);
      const og = parseOgTags(r.body);

      result = {
        ok: true,
        title: og.title || 'Плейлист',
        author: og.author || 'Яндекс Музыка',
        cover_url: og.cover_url,
        track_count: og.track_count,
        playlist_url: canonicalUrl,
        embed_url: embedUrl,
      };
    } else {
      const uid = userMatch[1];
      const kind = userMatch[2];
      const embedUrl = `https://music.yandex.ru/iframe/playlist/${uid}/${kind}`;
      const canonicalUrl = `https://music.yandex.ru/users/${uid}/playlists/${kind}`;

      // Try mobile API
      const apiRes = await fetchUrl(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`);

      if (apiRes.status === 200) {
        const data = JSON.parse(apiRes.body);
        const pl = data?.result ?? data;
        result = {
          ok: true,
          title: pl.title ?? pl.name ?? 'Плейлист',
          author: pl.owner?.name ?? pl.owner?.login ?? uid,
          cover_url: normalizeCover(pl.cover?.uri ?? pl.ogImage ?? null),
          track_count: pl.trackCount ?? pl.tracks?.length ?? 0,
          playlist_url: canonicalUrl,
          embed_url: embedUrl,
        };
      } else {
        // Fallback: scrape web page
        // Fallback: scrape iframe page
        const pageRes = await fetchUrl(`https://music.yandex.ru/iframe/playlist/${uid}/${kind}`);
        const og = parseOgTags(pageRes.body);
        result = {
          ok: og.title ? true : false,
          title: og.title || 'Плейлист',
          author: og.author || uid,
          cover_url: og.cover_url,
          track_count: og.track_count,
          playlist_url: canonicalUrl,
          embed_url: embedUrl,
        };
      }
    }

    res.writeHead(200, CORS);
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(200, CORS);
    res.end(JSON.stringify({
      ok: false, error: e.message,
      title: null, author: null, cover_url: null, track_count: 0,
      playlist_url: rawUrl, embed_url: '',
    }));
  }
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));
