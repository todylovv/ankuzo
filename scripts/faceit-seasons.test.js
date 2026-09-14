import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateSeasons, assignEloValues, levelFromElo, seasonAt } from "./faceit-seasons.js";

test("assigns a September 2026 match to season 9", () => {
  const season = seasonAt(Date.parse("2026-09-13T21:54:37Z"));
  assert.equal(season?.id, 9);
});

test("assigns an April 2026 match to season 8, not 7", () => {
  const lastOfSeven = seasonAt(Date.parse("2026-04-21T12:00:00Z"));
  const firstOfEight = seasonAt(Date.parse("2026-04-22T12:00:00Z"));
  assert.equal(lastOfSeven?.id, 7);
  assert.equal(firstOfEight?.id, 8);
});

test("keeps only elo matchmaking matches and drops empty seasons", () => {
  const seasons = aggregateSeasons(
    [
      {
        finishedAt: Date.parse("2026-09-01T12:00:00Z"),
        won: true,
        kd: 1.5,
        adr: 100,
        hs: 50,
        elo: true,
      },
      {
        finishedAt: Date.parse("2026-09-02T12:00:00Z"),
        won: false,
        kd: 0.9,
        adr: 80,
        hs: 40,
        elo: true,
      },
      {
        finishedAt: Date.parse("2026-06-01T12:00:00Z"),
        won: true,
        kd: 2,
        adr: 120,
        hs: 60,
        elo: false,
      },
    ],
    Date.parse("2026-09-14T00:00:00Z"),
  );

  assert.deepEqual(
    seasons.map((season) => season.id),
    [9],
  );
  assert.equal(seasons[0].current, true);
  assert.equal(seasons[0].label, "сезон 9");
  assert.equal(seasons[0].matches, 2);
  assert.equal(seasons[0].wins, 1);
  assert.equal(seasons[0].winRate, 50);
  assert.equal(seasons[0].kd, 1.2);
  assert.equal(seasons[0].adr, 90);
  assert.equal(seasons[0].hs, 45);
  assert.equal(seasons[0].maxElo, 0);
});

test("maps CS2 elo to skill levels 1 through 10", () => {
  assert.equal(levelFromElo(0), 1);
  assert.equal(levelFromElo(100), 1);
  assert.equal(levelFromElo(500), 1);
  assert.equal(levelFromElo(501), 2);
  assert.equal(levelFromElo(750), 2);
  assert.equal(levelFromElo(751), 3);
  assert.equal(levelFromElo(900), 3);
  assert.equal(levelFromElo(901), 4);
  assert.equal(levelFromElo(1050), 4);
  assert.equal(levelFromElo(1051), 5);
  assert.equal(levelFromElo(1200), 5);
  assert.equal(levelFromElo(1201), 6);
  assert.equal(levelFromElo(1350), 6);
  assert.equal(levelFromElo(1351), 7);
  assert.equal(levelFromElo(1530), 7);
  assert.equal(levelFromElo(1531), 8);
  assert.equal(levelFromElo(1750), 8);
  assert.equal(levelFromElo(1751), 9);
  assert.equal(levelFromElo(2000), 9);
  assert.equal(levelFromElo(2001), 10);
  assert.equal(levelFromElo(2508), 10);
});

test("takes the peak eloValue in each season as maxElo", () => {
  const seasons = aggregateSeasons(
    [
      {
        finishedAt: Date.parse("2026-09-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 2410,
      },
      {
        finishedAt: Date.parse("2026-09-02T12:00:00Z"),
        won: false,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 2508,
      },
      {
        finishedAt: Date.parse("2025-12-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 1980,
      },
    ],
    Date.parse("2026-09-14T00:00:00Z"),
  );

  assert.equal(seasons.find((season) => season.id === 9)?.maxElo, 2508);
  assert.equal(seasons.find((season) => season.id === 7)?.maxElo, 1980);
});

test("uses the higher of observed history and currentElo for the open season", () => {
  const seasons = aggregateSeasons(
    [
      {
        finishedAt: Date.parse("2026-09-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 2400,
      },
      {
        finishedAt: Date.parse("2025-12-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 1900,
      },
    ],
    Date.parse("2026-09-14T00:00:00Z"),
    undefined,
    2508,
  );

  assert.equal(seasons.find((season) => season.id === 9)?.maxElo, 2508);
  assert.equal(seasons.find((season) => season.id === 7)?.maxElo, 1900);
});

test("does not raise a past season maxElo when currentElo is higher", () => {
  const seasons = aggregateSeasons(
    [
      {
        finishedAt: Date.parse("2025-12-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
        eloValue: 1800,
      },
    ],
    Date.parse("2026-09-14T00:00:00Z"),
    undefined,
    2508,
  );

  assert.equal(seasons[0].id, 7);
  assert.equal(seasons[0].current, false);
  assert.equal(seasons[0].maxElo, 1800);
});

test("falls back to currentElo only for the open season when history is missing", () => {
  const seasons = aggregateSeasons(
    [
      {
        finishedAt: Date.parse("2026-09-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
      },
      {
        finishedAt: Date.parse("2025-12-01T12:00:00Z"),
        won: true,
        kd: 1,
        adr: 80,
        hs: 40,
        elo: true,
      },
    ],
    Date.parse("2026-09-14T00:00:00Z"),
    undefined,
    2508,
  );

  assert.equal(seasons.find((season) => season.id === 9)?.maxElo, 2508);
  assert.equal(seasons.find((season) => season.id === 7)?.maxElo, 0);
});

test("copies elo from the nearest history point onto each match", () => {
  const matches = [
    { finishedAt: Date.parse("2026-09-01T12:00:00Z"), matchId: "a" },
    { finishedAt: Date.parse("2026-09-02T12:00:00Z"), matchId: "b" },
  ];
  const history = [
    { matchId: "a", elo: 2410, at: Date.parse("2026-09-01T12:05:00Z") },
    { matchId: "b", elo: 2508, at: Date.parse("2026-09-02T12:04:00Z") },
  ];

  const withElo = assignEloValues(matches, history);
  assert.equal(withElo[0].eloValue, 2410);
  assert.equal(withElo[1].eloValue, 2508);
});

test("matches history by timestamp when match ids are missing", () => {
  const matches = [{ finishedAt: Date.parse("2026-09-01T12:00:00Z") }];
  const history = [
    { elo: 2300, at: Date.parse("2026-08-20T12:00:00Z") },
    { elo: 2440, at: Date.parse("2026-09-01T12:10:00Z") },
    { elo: 2508, at: Date.parse("2026-09-10T12:00:00Z") },
  ];

  const [match] = assignEloValues(matches, history);
  assert.equal(match.eloValue, 2440);
});
