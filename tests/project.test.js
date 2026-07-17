import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("browser scripts are valid JavaScript", async () => {
  for (const file of ["js/boot.js", "js/interface.js", "js/hero-shader.js"]) {
    const source = await read(file);
    assert.doesNotThrow(() => new vm.Script(source, { filename: file }));
  }
});

test("build and update scripts are valid JavaScript", () => {
  for (const file of ["scripts/build-static.js", "scripts/update-data.js"]) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", path.join(root, file)]));
  }
});

test("static DOM references exist", async () => {
  const html = await read("index.html");
  const scripts = await Promise.all(["js/boot.js", "js/interface.js", "js/hero-shader.js"].map(read));
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const optional = new Set(["psn-copy-2"]);
  const referenced = scripts.flatMap((source) =>
    [...source.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((match) => match[1])
  );
  const missing = [...new Set(referenced)].filter((id) => !ids.has(id) && !optional.has(id));
  assert.deepEqual(missing, []);
});

test("release version is synchronized across public assets", async () => {
  const html = await read("index.html");
  const pkg = JSON.parse(await read("package.json"));
  for (const asset of ["css/system.css", "css/editorial.css", "js/boot.js", "js/interface.js", "js/hero-shader.js"]) {
    assert.match(html, new RegExp(`${asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?v=${pkg.version.replace(/\./g, "\\.")}`));
  }
});

test("headline statistics come from public data instead of hardcoded copy", async () => {
  const html = await read("index.html");
  const script = await read("js/interface.js");
  assert.match(html, /id="bridge-hours"/);
  assert.match(html, /id="counter-hours"/);
  assert.doesNotMatch(html, />5 003</);
  assert.match(script, /setText\("bridge-hours"/);
  assert.match(script, /setText\("counter-hours"/);
});

test("public copy uses one identity and accessible interaction labels", async () => {
  const html = await read("index.html");
  assert.doesNotMatch(html, /также использую ник/i);
  assert.match(html, /Я — <b>Anku \/ Ankuzo<\/b>/);
  assert.match(html, /id="heroShaderCanvas"[^>]*tabindex="0"[^>]*aria-label=/);
  assert.match(html, /class="fx fx-grid" aria-hidden="true"/);
  for (const id of ["core", "steam", "ps5", "signal"]) {
    assert.match(html, new RegExp(`<section id="${id}"[^>]*aria-labelledby="[^"]+"`));
  }
  assert.match(html, /id="toast" role="status" aria-live="polite"><\/div>/);
});

test("authored game art is local and deployable", async () => {
  const html = await read("index.html");
  const images = [...html.matchAll(/data-game-image="\.\/([^"]+)"/g)].map((match) => match[1]);
  assert.equal(images.length, 5);
  for (const image of images) {
    assert.ok((await stat(path.join(root, image))).isFile(), `${image} is missing`);
  }
  assert.doesNotMatch(html, /data-game-image="https?:/);
});

test("stylesheets have balanced blocks", async () => {
  for (const file of ["css/system.css", "css/editorial.css"]) {
    const css = await read(file);
    assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, `${file}: unbalanced braces`);
  }
});

test("public JSON has consistent source state and valid dates", async () => {
  for (const file of ["steam", "psn", "discord", "faceit", "trn"]) {
    const data = JSON.parse(await read(`data/${file}.json`));
    assert.ok(["api", "fallback"].includes(data.source), `${file}: unknown source`);
    if (data.source === "api") assert.equal(data.status, "available", `${file}: API must be available`);
    if (data.source === "fallback") assert.equal(data.status, "unavailable", `${file}: fallback must be unavailable`);
    if (data.updatedAt) assert.ok(Number.isFinite(Date.parse(data.updatedAt)), `${file}: invalid updatedAt`);
  }
});

test("PlayStation progress values are bounded", async () => {
  const data = JSON.parse(await read("data/psn.json"));
  assert.ok(Array.isArray(data.library));
  data.library.forEach((game) => {
    assert.ok(game.title, "PlayStation game must have a title");
    if (game.trophyProgress !== null && game.trophyProgress !== undefined) {
      assert.ok(Number(game.trophyProgress) >= 0 && Number(game.trophyProgress) <= 100);
    }
  });
});

test("required deploy files exist", async () => {
  for (const file of ["index.html", "robots.txt", "sitemap.xml", "css/system.css", "css/editorial.css"]) {
    assert.ok((await stat(path.join(root, file))).isFile(), `${file} is missing`);
  }
});
