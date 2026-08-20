import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

const REQUEST_ORIGIN = "https://ankuzo.example";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`${REQUEST_ORIGIN}/`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

let cached;
async function html() {
  cached ??= await render().then((response) => response.text());
  return cached;
}

/** Reads the `content` of a `<meta name|property="...">` tag from rendered HTML. */
function meta(markup, key) {
  const pattern = new RegExp(
    `<meta[^>]*(?:name|property)="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
    "i",
  );
  const tag = markup.match(pattern)?.[0];
  if (!tag) return null;
  return tag.match(/content="([^"]*)"/i)?.[1] ?? null;
}

/** Text content of every occurrence of a tag, tags stripped. */
function textOf(markup, tag) {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g"))]
    .map((match) => match[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "").trim());
}

// The 3D layer loads lazily, so the server never renders the scene chrome —
// that is the point: the ~940KB three.js chunk must not block first paint.
// What the server owes instead is a page that already means something without
// it, which is what these assertions pin down.
test("server-renders a meaningful page before the 3D layer arrives", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const markup = await response.text();

  assert.match(markup, /<title>ANKUZO — SESSION 22<\/title>/i);

  // Prose, not a wall of uppercase labels: a crawler must find real sentences.
  const lede = markup.match(/class="experience-intro-lede">([^<]+)</)?.[1] ?? "";
  assert.ok(lede.length > 80, "the intro must carry a real description");
  assert.match(lede, /[.!?]/, "the description must be sentences, not labels");

  // The whole journey is announced up front, so the table of contents survives
  // even when WebGL never starts.
  for (const chapter of ["PORTAL", "STEAM", "PLAYSTATION", "PRESENCE", "22 / END"]) {
    assert.ok(markup.includes(chapter), `chapter index must list ${chapter}`);
  }

  // Scroll must stay free until the experience actually takes over.
  assert.doesNotMatch(markup, /data-experience-locked="true"/);

  assert.doesNotMatch(markup, /hero-22\.webp|gaming-totem\.webp/);
  assert.doesNotMatch(markup, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships a valid social card that points at a real image file", async () => {
  const markup = await html();
  const og = await stat(new URL("../public/og.png", import.meta.url));
  assert.ok(og.size > 0 && og.size < 500_000, "og.png must exist and stay under 500KB");

  assert.equal(meta(markup, "twitter:card"), "summary_large_image");
  assert.equal(meta(markup, "og:type"), "website");
  assert.equal(meta(markup, "og:locale"), "ru_RU");
  assert.equal(meta(markup, "og:title"), "ANKUZO — SESSION 22");
  assert.equal(meta(markup, "og:image:width"), "1200");
  assert.equal(meta(markup, "og:image:height"), "630");
  assert.ok((meta(markup, "og:image:alt") ?? "").length > 0, "og:image needs alt text");
  assert.ok((meta(markup, "description") ?? "").length > 40, "page needs a real meta description");
  assert.equal(meta(markup, "og:image"), meta(markup, "twitter:image"));
});

// The og:image must be absolute and must never advertise a localhost URL:
// app/layout.tsx now builds it from `metadataBase` (NEXT_PUBLIC_SITE_URL, or the
// canonical production origin), so the rendered origin is the deployed one.
// Social scrapers do not run JavaScript and do not resolve relative URLs, so
// the card must ship an absolute address. It deliberately does NOT track the
// request origin: deriving it from the Host header is what produced
// `http://localhost:3000/og.png` in production, and reading headers at all is
// what forced the route to render dynamically.
test("og:image is an absolute, non-local URL", async () => {
  const markup = await html();
  const image = meta(markup, "og:image");
  assert.ok(image, "og:image must be present");
  assert.match(image, /^https:\/\/[^/]+\/og\.png$/, "og:image must be an absolute https URL");
  assert.doesNotMatch(image, /localhost|127\.0\.0\.1|\.invalid/);
  assert.equal(meta(markup, "twitter:image"), image);
});

test("renders a semantic document outline", async () => {
  const markup = await html();

  assert.match(markup, /<html lang="ru"/, "the document must declare its language");
  assert.equal((markup.match(/<main\b/g) ?? []).length, 1, "exactly one main landmark");

  // Exactly one h1, and it names the site rather than decorating it. The
  // portal's own "22" heading exists only once the scene mounts, and is
  // visually hidden rather than display:none so it stays in the a11y tree.
  assert.equal((markup.match(/<h1\b/g) ?? []).length, 1, "exactly one h1");
  assert.deepEqual(textOf(markup, "h1"), ["ANKUZO"]);

  // The chapter index is a list, so assistive tech announces its length.
  const listItems = markup.match(/<li\b/g) ?? [];
  assert.equal(listItems.length, 5, "one list item per chapter");
});

test("boots the theme before paint", async () => {
  const markup = await html();

  // The anti-flash bootstrap must run inside <head>, before <body> paints.
  const head = markup.slice(0, markup.indexOf("<body"));
  assert.match(head, /document\.documentElement\.dataset\.theme/, "theme is applied in <head>");
  assert.match(head, /prefers-color-scheme: dark/, "system preference is the last resort");
  assert.match(head, /ankuzo-theme/, "the stored preference key is read on boot");
  assert.match(head, /<link rel="stylesheet"[^>]*\.css"/, "styles are linked, not inlined per element");

  // Server output stays theme-neutral: no data-theme is baked in, so the
  // bootstrap decides and hydration cannot mismatch. The toggle itself lives
  // in the lazily loaded scene and is deliberately absent here.
  assert.doesNotMatch(markup, /<html[^>]*data-theme=/);
});
