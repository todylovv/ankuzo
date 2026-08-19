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

test("server-renders the continuous ANKUZO experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>ANKUZO — SESSION 22<\/title>/i);
  assert.match(html, /CONTINUOUS SESSION \/ 22/);
  assert.match(html, /SCROLL TO ENTER/);
  assert.match(html, /LIBRARY/);
  assert.match(html, /PLATFORMS/);
  assert.match(html, /ONLINE/);
  assert.match(html, /BUILD/);
  assert.match(html, /IDENTITY RECONSTRUCTED/);
  assert.match(html, /SCENE PROGRESS/);
  assert.doesNotMatch(html, /hero-22\.webp|gaming-totem\.webp/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps the authored identity reference and social metadata", async () => {
  const response = await render();
  const html = await response.text();
  const identity = await stat(new URL("../public/assets/hero-22.webp", import.meta.url));
  assert.ok(identity.size > 10_000 && identity.size < 500_000);
  const og = await stat(new URL("../public/og.png", import.meta.url));
  assert.ok(og.size < 500_000);
  assert.match(html, /https?:\/\/[^/]+\/og\.png/);
  assert.match(html, /summary_large_image/);
});

test("includes responsive and reduced-motion fallbacks", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const portal = await readFile(new URL("../components/portal/PortalExperience.tsx", import.meta.url), "utf8");
  const world = await readFile(new URL("../components/portal/ContinuousWorld.tsx", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /data-experience-locked="true"/);
  assert.match(css, /\.experience-shell,\.experience-stage/);
  assert.match(portal, /event\.preventDefault\(\)/);
  assert.match(portal, /passive: false/);
  assert.match(portal, /renderedProgress/);
  assert.match(portal, /targetProgress/);
  assert.match(portal, /REVIEW_STATES/);
  assert.match(portal, /frame: "stress"/);
  assert.match(portal, /frame: "cracks"/);
  assert.match(portal, /frame: "breakthrough"/);
  assert.match(portal, /data-target-chapter/);
  assert.match(world, /library-atlas\.webp/);
  assert.match(world, /useGothicTwoGeometry/);
});

test("shares semantic light and dark themes across DOM and WebGL", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const portal = await readFile(new URL("../components/portal/PortalExperience.tsx", import.meta.url), "utf8");
  const material = await readFile(new URL("../components/portal/FracturedTwo.tsx", import.meta.url), "utf8");
  const palette = await readFile(new URL("../components/portal/theme.ts", import.meta.url), "utf8");
  assert.match(css, /--bg-primary:#E7E3DA/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /--bg-primary:#282B31/);
  assert.match(css, /--chrome-base:#8F969D/);
  assert.match(layout, /prefers-color-scheme: dark/);
  assert.match(layout, /ankuzo-theme/);
  assert.match(portal, /theme-switch/);
  assert.match(portal, /themeProgress/);
  assert.match(portal, /GothicEnvironment/);
  assert.match(material, /metalness: 0\.9/);
  assert.match(material, /LIGHT_PALETTE\.chrome/);
  assert.match(material, /DARK_PALETTE\.chrome/);
  assert.doesNotMatch(portal, /#0{3,6}\b/i);
  assert.match(palette, /background: "#E7E3DA"/);
  assert.match(palette, /background: "#282B31"/);
});
