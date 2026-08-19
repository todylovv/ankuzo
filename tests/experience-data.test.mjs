import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  normalizeExperienceData,
  normalizeGameTitle,
} from "../lib/experience-data.ts";
import {
  applyDataReviewFixture,
  parseDataReviewFixture,
} from "../lib/experience-fixtures.ts";

const NOW = Date.parse("2026-08-19T12:00:00.000Z");

const BASE = {
  steam: {
    updatedAt: "2026-08-19T11:00:00.000Z",
    source: "api",
    status: "available",
    profiles: [
      {
        steamId: "76561198000000000",
        nickname: "anku",
        avatarUrl: "https://example.test/avatar.webp",
        online: false,
        currentGame: "",
        games: [{ appId: 730, name: "Counter-Strike 2" }],
      },
    ],
    top: [
      {
        appId: 730,
        name: "Counter-Strike 2",
        hours: 820.8,
        iconUrl: "https://example.test/cs2.webp",
      },
    ],
    stats: { totalHours: 820.8, totalGames: 1 },
  },
  psn: {
    updatedAt: "2026-08-19T11:00:00.000Z",
    source: "api",
    status: "available",
    psnId: "ankuzo",
    trophies: { total: 22, gold: 2 },
    library: [
      {
        title: "Counter-Strike 2™ PS5",
        platform: "PS5",
        trophyMatched: true,
        trophyProgress: 22,
        iconUrl: "https://example.test/psn.webp",
      },
    ],
  },
  discord: {
    updatedAt: "2026-08-19T11:00:00.000Z",
    source: "api",
    status: "available",
    username: "ankuzo",
    displayName: "ANKUZO",
    presence: "offline",
    avatarUrl: "https://example.test/discord.webp",
  },
};

test("normalizes source records and only creates conservative exact overlaps", () => {
  const data = normalizeExperienceData(BASE, { now: NOW });
  assert.equal(normalizeGameTitle("Counter-Strike 2™ PS5"), "counter strike 2");
  assert.equal(data.steam.health.availability, "available");
  assert.equal(data.playstation.games[0].platformLabel, "PS5");
  assert.equal(data.overlaps.length, 1);
  assert.equal(data.overlaps[0].confidence, "exact");
  assert.equal(data.steam.totalHours, 820.8);
  assert.equal(data.playstation.trophies.total, 22);
});

test("review query supports every requested deterministic data state", () => {
  const fixture = parseDataReviewFixture(
    "?review=1&steam=current&psn=available&discord=idle&health=stale&images=failure",
  );
  assert.deepEqual(fixture, {
    enabled: true,
    steam: "current",
    playstation: "available",
    discord: "idle",
    health: "stale",
    images: "failure",
  });

  const snapshots = applyDataReviewFixture(BASE, fixture, { now: NOW });
  const data = normalizeExperienceData(snapshots, { now: NOW });
  assert.equal(data.steam.currentGame?.title, "Counter-Strike 2");
  assert.equal(data.steam.profiles[0].online, true);
  assert.equal(data.playstation.health.usable, true);
  assert.equal(data.discord.presence, "idle");
  assert.equal(data.steam.health.availability, "stale");
  assert.equal(data.playstation.games[0].icon, "/__review__/missing-image.webp");
  assert.equal(data.discord.avatar, "/__review__/missing-image.webp");
});

test("review fixtures cannot override production URLs", () => {
  const fixture = parseDataReviewFixture(
    "?steam=current&psn=available&discord=online&health=fallback&images=failure",
  );
  assert.equal(fixture.enabled, false);
  const snapshots = applyDataReviewFixture(BASE, fixture, { now: NOW });
  assert.equal(snapshots, BASE);
  const data = normalizeExperienceData(snapshots, { now: NOW });
  assert.equal(data.steam.currentGame, undefined);
  assert.equal(data.discord.presence, "offline");
});

test("offline and fallback fixtures preserve a usable safe snapshot", () => {
  const fixture = parseDataReviewFixture(
    "?review=1&steam=offline&discord=offline&health=fallback",
  );
  const data = normalizeExperienceData(
    applyDataReviewFixture(BASE, fixture, { now: NOW }),
    { now: NOW },
  );
  assert.equal(data.steam.currentGame, undefined);
  assert.equal(data.steam.profiles[0].online, false);
  assert.equal(data.discord.presence, "offline");
  assert.equal(data.steam.health.availability, "fallback");
  assert.equal(data.steam.health.usable, true);
});

test("unsafe media protocols are rejected by the normalized client model", () => {
  const input = structuredClone(BASE);
  input.steam.top[0].iconUrl = "javascript:alert(1)";
  input.psn.library[0].iconUrl = "data:text/html,unsafe";
  input.discord.avatarUrl = "file:///private/avatar.png";
  const data = normalizeExperienceData(input, { now: NOW });
  assert.equal(data.steam.games[0].icon, undefined);
  assert.equal(data.playstation.games[0].icon, undefined);
  assert.equal(data.discord.avatar, undefined);
});

test("committed public snapshots contain no credential fields or secret values", async () => {
  const dataDirectory = new URL("../public/data/", import.meta.url);
  const files = (await readdir(dataDirectory)).filter((name) => name.endsWith(".json"));
  assert.ok(files.length >= 3);

  for (const file of files) {
    const raw = await readFile(new URL(file, dataDirectory), "utf8");
    assert.doesNotMatch(
      raw,
      /(?:steam[_-]?(?:key|api[_-]?key)|psn[_-]?npsso|npsso|access[_-]?token|client[_-]?secret|private[_-]?key)/i,
      `${file} must not include credential keys`,
    );
    assert.doesNotMatch(raw, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  }
});

