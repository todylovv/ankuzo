export type GameArt = {
  appId?: number;
  hero?: string;
  poster?: string;
  header?: string;
  still?: string;
  capsule?: string;
  image?: string;
};

export function steamCdn(appId: number) {
  const base = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}`;
  return {
    hero: `${base}/library_hero.jpg`,
    poster: `${base}/library_600x900.jpg`,
    header: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
  };
}

export function artUrls(art: GameArt, kind: "wide" | "poster"): string[] {
  const cdn = art.appId ? steamCdn(art.appId) : undefined;
  const preferred =
    kind === "poster"
      ? [art.poster, cdn?.poster, art.hero, cdn?.hero, art.still, art.header, cdn?.header, art.capsule, cdn?.capsule, art.image]
      : [art.hero, cdn?.hero, art.still, art.header, cdn?.header, art.poster, cdn?.poster, art.capsule, cdn?.capsule, art.image];
  return [...new Set(preferred.filter((url): url is string => Boolean(url)))];
}

export function artFromMap(
  appId: number | undefined,
  map: Record<string, GameArt> | undefined,
  extra: GameArt = {},
): GameArt {
  if (!appId) return extra;
  const stored = map?.[String(appId)] || {};
  return { appId, ...stored, ...extra };
}
