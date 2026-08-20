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

/** All tag/attribute occurrences, e.g. every `data-target-chapter` value. */
function attributeValues(markup, attribute) {
  return [...markup.matchAll(new RegExp(`${attribute}="([^"]*)"`, "g"))].map((match) => match[1]);
}

/** Text content of every occurrence of a tag, tags stripped. */
function textOf(markup, tag) {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g"))]
    .map((match) => match[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "").trim());
}

test("server-renders the continuous ANKUZO experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const markup = await response.text();
  assert.match(markup, /<title>ANKUZO — SESSION 22<\/title>/i);
  assert.match(markup, /CONTINUOUS SESSION \/ 22/);
  assert.match(markup, /SCROLL TO ENTER/);
  assert.match(markup, /LIBRARY/);
  assert.match(markup, /PLATFORMS/);
  assert.match(markup, /ONLINE/);
  assert.match(markup, /BUILD/);
  assert.match(markup, /IDENTITY RECONSTRUCTED/);
  assert.match(markup, /SCENE PROGRESS/);
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

// KNOWN BUG (todo): app/layout.tsx falls back to `localhost:3000` whenever the
// incoming request carries no `host` header, so the rendered card advertises
// `http://localhost:3000/og.png` — an image no crawler can fetch. The og:image
// must be absolute and built from the origin the page was actually served on.
test("og:image is absolute and matches the serving origin", { todo: "layout falls back to http://localhost:3000" }, async () => {
  const markup = await html();
  const image = meta(markup, "og:image");
  assert.equal(image, `${REQUEST_ORIGIN}/og.png`);
  assert.equal(meta(markup, "twitter:image"), `${REQUEST_ORIGIN}/og.png`);
  assert.doesNotMatch(image ?? "", /localhost|127\.0\.0\.1/);
});

test("renders a semantic, navigable document outline", async () => {
  const markup = await html();

  assert.match(markup, /<html lang="ru"/, "the document must declare its language");
  assert.equal((markup.match(/<main\b/g) ?? []).length, 1, "exactly one main landmark");
  assert.equal((markup.match(/<h1\b/g) ?? []).length, 1, "exactly one h1");
  assert.deepEqual(textOf(markup, "h1"), ["22"]);

  // Every chapter after the portal owns an h2, in authored reading order.
  assert.deepEqual(textOf(markup, "h2"), ["LIBRARY", "PLATFORMS", "ONLINE", "BUILD", "ANKUZO"]);

  // The stage is a labelled region and its label element actually exists.
  const labelledBy = markup.match(/<section[^>]*class="experience-stage"[^>]*aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(labelledBy, "the experience stage must be labelled");
  assert.ok(markup.includes(`id="${labelledBy}"`), `aria-labelledby="${labelledBy}" must resolve to a node`);

  // The skip link must target an id that exists in the document.
  const skipTarget = markup.match(/class="skip-link" href="#([^"]+)"/)?.[1];
  assert.ok(skipTarget, "a skip link must be rendered before the canvas");
  assert.ok(markup.includes(`id="${skipTarget}"`), `skip link target #${skipTarget} must exist`);

  // Chapter navigation is a labelled landmark with one button per chapter.
  assert.match(markup, /<nav class="chapter-nav" aria-label="[^"]+"/);
  assert.deepEqual(
    attributeValues(markup, "data-target-chapter"),
    ["portal", "library", "platforms", "online", "build", "final"],
  );
  for (const button of markup.match(/<button[^>]*data-target-chapter[^>]*>/g) ?? []) {
    assert.match(button, /type="button"/, "chapter controls must not submit anything");
    assert.match(button, /aria-label="\d{2} .+"/, "chapter controls need an accessible name");
  }

  // Decorative chrome is hidden from assistive tech; live data is announced.
  assert.match(markup, /<div class="experience-meter" aria-hidden="true"/);
  assert.match(markup, /<div class="experience-signals" aria-live="polite"/);
});

test("boots the theme before paint and exposes a toggle-state control", async () => {
  const markup = await html();

  // The anti-flash bootstrap must run inside <head>, before <body> paints.
  const head = markup.slice(0, markup.indexOf("<body"));
  assert.match(head, /document\.documentElement\.dataset\.theme/, "theme is applied in <head>");
  assert.match(head, /prefers-color-scheme: dark/, "system preference is the last resort");
  assert.match(head, /ankuzo-theme/, "the stored preference key is read on boot");
  assert.match(head, /<link rel="stylesheet"[^>]*\.css"/, "styles are linked, not inlined per element");

  // Server output stays theme-neutral: no data-theme is baked in, so the
  // bootstrap decides and hydration cannot mismatch.
  assert.doesNotMatch(markup, /<html[^>]*data-theme=/);

  const toggle = markup.match(/<button[^>]*class="theme-switch"[^>]*>/)?.[0];
  assert.ok(toggle, "a theme switch must be rendered");
  assert.match(toggle, /aria-pressed="(true|false)"/, "the switch must expose its state");
  assert.match(toggle, /aria-label="[^"]+"/, "the icon-only switch needs an accessible name");
  assert.match(toggle, /type="button"/);

  // Its decorative icon is hidden and the visible label mirrors the state.
  assert.match(markup, /class="theme-switch"[\s\S]{0,200}<i aria-hidden="true">/);
  assert.match(markup, /THEME \//);
});
