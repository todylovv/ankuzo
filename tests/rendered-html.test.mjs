import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://ankuzo.example/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete ANKUZO experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>ANKUZO — SESSION 22<\/title>/i);
  assert.match(html, /PERSONAL SIGNAL/);
  assert.match(html, /LIBRARY \/ PERSONAL CUT/);
  assert.match(html, /TWO INPUTS \/ ONE HABIT/);
  assert.match(html, /AFTER HOURS/);
  assert.match(html, /BUILD TRACE/);
  assert.match(html, /END OF SESSION/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships optimized authored assets and social metadata", async () => {
  const response = await render();
  const html = await response.text();
  for (const file of ["hero-22.webp", "gaming-totem.webp", "library-atlas.webp"]) {
    const asset = await stat(new URL(`../public/assets/${file}`, import.meta.url));
    assert.ok(asset.size > 10_000 && asset.size < 500_000, `${file} should be optimized`);
    assert.match(html, new RegExp(file.replace(".", "\\.")));
  }
  const og = await stat(new URL("../public/og.png", import.meta.url));
  assert.ok(og.size < 500_000);
  assert.match(html, /https?:\/\/[^/]+\/og\.png/);
  assert.match(html, /summary_large_image/);
});

test("includes responsive and reduced-motion fallbacks", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /scroll-snap-type:x proximity/);
});
