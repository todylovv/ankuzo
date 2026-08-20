import { Color, DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from "three";

export type ThemeName = "light" | "dark";

export type ScenePalette = {
  background: string;
  depth: string;
  surface: string;
  architecture: string;
  chrome: string;
  chromeSide: string;
  chromeSecondary: string;
  chromeHighlight: string;
  chromeShadow: string;
  raw: string;
  fracture: string;
  crackLight: string;
  ambient: string;
  key: string;
  fill: string;
  rear: string;
  reflectionTop: string;
  reflectionSide: string;
  reflectionEdge: string;
  reflectionShadow: string;
  reflectionFloor: string;
  ambientIntensity: number;
  keyIntensity: number;
  fillIntensity: number;
  rearIntensity: number;
  exposure: number;
};

export const SCENE_PALETTES: Record<ThemeName, ScenePalette> = {
  // Mirrors the CSS custom properties in app/globals.css. When one side moves
  // the other has to follow, or the HTML overlays stop belonging to the scene
  // behind them.
  light: {
    background: "#EDEBE4",
    depth: "#E3E0D7",
    surface: "#F7F6F1",
    architecture: "#C6C1B6",
    chrome: "#97A1AC",
    chromeSide: "#4A525C",
    chromeSecondary: "#7C8691",
    chromeHighlight: "#E4E9EF",
    chromeShadow: "#4A525C",
    raw: "#6B737C",
    fracture: "#14171C",
    crackLight: "#F7F6F1",
    ambient: "#DCD8CE",
    key: "#FFFDF8",
    fill: "#B8C0C8",
    rear: "#F2F0EA",
    reflectionTop: "#FFFDF8",
    reflectionSide: "#C3CBD3",
    reflectionEdge: "#F2F0EA",
    reflectionShadow: "#5C646D",
    reflectionFloor: "#DCD8CE",
    ambientIntensity: 0.72,
    keyIntensity: 3.65,
    fillIntensity: 1.6,
    rearIntensity: 2.75,
    exposure: 1.08,
  },
  dark: {
    background: "#0B0E13",
    depth: "#08090C",
    surface: "#141920",
    architecture: "#252B34",
    chrome: "#B8C0C8",
    chromeSide: "#6B737C",
    chromeSecondary: "#97A1AC",
    chromeHighlight: "#E4E9EF",
    chromeShadow: "#4A525C",
    raw: "#1C222A",
    fracture: "#05070A",
    crackLight: "#E4E9EF",
    ambient: "#97A1AC",
    key: "#EDF1F4",
    fill: "#8892A0",
    rear: "#D5DBE0",
    reflectionTop: "#F2F4F6",
    reflectionSide: "#A2ACB6",
    reflectionEdge: "#E4E9EF",
    reflectionShadow: "#4A525C",
    reflectionFloor: "#9BA4AC",
    ambientIntensity: 0.36,
    keyIntensity: 3.9,
    fillIntensity: 1.45,
    rearIntensity: 2.9,
    exposure: 1.04,
  },
};

export const LIGHT_PALETTE = SCENE_PALETTES.light;
export const DARK_PALETTE = SCENE_PALETTES.dark;

const COLOR_CACHE = new Map<string, Color>();

function cachedColor(value: string) {
  const existing = COLOR_CACHE.get(value);
  if (existing) return existing;
  const color = new Color(value);
  COLOR_CACHE.set(value, color);
  return color;
}

export function mixColor(target: Color, light: string, dark: string, progress: number) {
  target.lerpColors(cachedColor(light), cachedColor(dark), progress);
  return target;
}

export function mixNumber(light: number, dark: number, progress: number) {
  return light + (dark - light) * progress;
}

function createChromeResponseTexture() {
  // 128px is plenty: the response is a smooth sweep with no high-frequency detail.
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

let chromeResponseTexture: DataTexture | null = null;

/**
 * Immutable, shared by every chrome material for the lifetime of the module —
 * building it costs ~460k Math.exp on the main thread, so it is never disposed.
 */
export function getChromeResponseTexture() {
  chromeResponseTexture ??= createChromeResponseTexture();
  return chromeResponseTexture;
}
