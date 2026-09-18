import { optionalAssets } from "virtual:optional-assets";

export function useOptionalAsset(
  kind:
    | "heroSky"
    | "ankuzo"
    | "twentyTwo"
    | "portrait"
    | "playground"
    | { game: string },
): boolean {
  if (typeof kind === "object") {
    return Boolean(optionalAssets.games[kind.game]);
  }
  return optionalAssets[kind];
}
