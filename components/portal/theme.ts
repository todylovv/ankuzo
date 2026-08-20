import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from "three";

/**
 * One palette, designed as a lighting environment rather than as a set of
 * tokens.
 *
 * The artefact is a mirror — metalness 0.98, roughness 0.115 — so it has no
 * colour of its own and shows whatever surrounds it. That makes the light the
 * primary design decision and the swatches secondary. It is also why the site
 * carries a single theme now: a mirror cannot be lit well for two grounds at
 * once, and the compromise environment was exactly why the glyph used to read
 * as a black silhouette instead of as polished metal.
 *
 * The ground is deliberately not pure black. On #000 the fog, the floor and
 * the object's own shadow side all collapse into the same nothing, and the
 * glyph loses its volume.
 */
export const SCENE = {
  /** Deepest value — fog and the far end of the room. */
  void: "#06080C",
  /** The ground everything sits on. */
  background: "#0A0E14",
  depth: "#080B10",
  surface: "#141922",
  architecture: "#232A36",

  /** What the mirror is made to show. */
  chrome: "#B6C0CC",
  chromeSide: "#68727F",
  chromeSecondary: "#98A3B0",
  chromeHighlight: "#F2F5F8",
  chromeShadow: "#3B4450",
  raw: "#1B2029",
  fracture: "#06080C",
  crackLight: "#E6ECF3",

  /* Lights. The key is cool and wide, the fill is dimmer and warmer so the
     shadow side never goes fully blue, and the rear rim separates the glyph
     from the fog behind it. */
  ambient: "#7E8896",
  key: "#EEF3F8",
  fill: "#7E8A99",
  rear: "#C9D4E0",

  /* The reflection set. Broad soft planes give the glyph a gradient across its
     faces; the two narrow strips are the specular edges that draw its
     silhouette. Narrow strips alone — the previous arrangement — leave black
     between them, which is what a mirror faithfully reproduces. */
  reflectionSky: "#DCE6F2",
  reflectionFloor: "#2A323E",
  reflectionEdge: "#FFFFFF",
  reflectionSide: "#93A1B2",
  reflectionWarm: "#FFB489",

  ambientIntensity: 0.42,
  keyIntensity: 3.7,
  fillIntensity: 1.35,
  rearIntensity: 2.6,
  exposure: 1.06,
} as const;

export type ScenePalette = typeof SCENE;

export function createChromeResponseTexture() {
  const width = 128;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  const gaussian = (value: number, center: number, spread: number) => {
    const distance = (value - center) / spread;
    return Math.exp(-distance * distance);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      const sweep = Math.min(1, Math.max(0, u + (v - 0.5) * 0.12));
      let value = 0.82;
      value -= gaussian(sweep, 0.12, 0.1) * 0.3;
      value += gaussian(sweep, 0.285, 0.022) * 0.18;
      value -= gaussian(sweep, 0.49, 0.13) * 0.22;
      value += gaussian(sweep, 0.69, 0.032) * 0.2;
      value -= gaussian(sweep, 0.88, 0.085) * 0.24;
      value += gaussian(sweep, 0.965, 0.018) * 0.12;
      value *= 0.94 + Math.sin(v * Math.PI) * 0.06;
      const channel = Math.round(Math.min(1, Math.max(0.44, value)) * 255);
      const offset = (y * width + x) * 4;
      data[offset] = channel;
      data[offset + 1] = channel;
      data[offset + 2] = channel;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

let chromeResponse: DataTexture | null = null;

/** Lazy singleton: the gradient is identical everywhere it is used. */
export function getChromeResponseTexture() {
  return (chromeResponse ??= createChromeResponseTexture());
}
