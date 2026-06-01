const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const uuid = new URL(req.url).searchParams.get("uuid") || "";
    if (!/^[a-f0-9-]{36}$/i.test(uuid)) {
      return json({ error: "Invalid playlist UUID" }, 400);
    }

    const response = await fetch(`https://api.music.yandex.net/playlist/${uuid}`);
    if (!response.ok) {
      return json({ error: `Yandex API returned ${response.status}` }, 502);
    }

    const payload = await response.json();
    const playlist = payload?.result;
    const owner = playlist?.owner?.login;
    const kind = playlist?.kind;
    if (!owner || kind === undefined || kind === null) {
      return json({ error: "Playlist metadata is incomplete" }, 502);
    }

    let coverUrl = "";
    const coverUri = playlist?.cover?.uri;
    if (coverUri) {
      coverUrl = `https://${coverUri.replace("%%", "200x200")}`;
    }

    return json({
      playlist_url: `https://music.yandex.ru/playlists/${uuid}`,
      embed_url: `https://music.yandex.ru/iframe/playlist/${owner}/${kind}`,
      title: playlist?.title || "Яндекс плейлист",
      author: playlist?.owner?.name || owner,
      cover_url: coverUrl,
      track_count: playlist?.trackCount || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected resolver error";
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
