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
  light: {
    background: "#E7E3DA",
    depth: "#D5D0C6",
    surface: "#F1EEE7",
    architecture: "#AAA49B",
    chrome: "#9AA1A7",
    chromeSide: "#59626A",
    chromeSecondary: "#7B838A",
    chromeHighlight: "#DCE0E3",
    chromeShadow: "#5F666D",
    raw: "#646A6F",
    fracture: "#202328",
    crackLight: "#F1EEE7",
    ambient: "#D8D4CC",
    key: "#FFFDF6",
    fill: "#B8C0C7",
    rear: "#F0EDE5",
    reflectionTop: "#FFFDF7",
    reflectionSide: "#C7CDD2",
    reflectionEdge: "#F4F2EC",
    reflectionShadow: "#687077",
    reflectionFloor: "#D7D2C9",
    ambientIntensity: 0.72,
    keyIntensity: 3.65,
    fillIntensity: 1.6,
    rearIntensity: 2.75,
    exposure: 1.08,
  },
  dark: {
    background: "#282B31",
    depth: "#1E2227",
    surface: "#31353C",
    architecture: "#4A5059",
    chrome: "#B3BAC0",
    chromeSide: "#727C85",
    chromeSecondary: "#929AA1",
    chromeHighlight: "#E0E4E7",
    chromeShadow: "#626A72",
    raw: "#3C4149",
    fracture: "#15181C",
    crackLight: "#E0E4E7",
    ambient: "#9EA6AD",
    key: "#EEF1F2",
    fill: "#8F9AA4",
    rear: "#D5DBDE",
    reflectionTop: "#F2F4F3",
    reflectionSide: "#A9B2B9",
    reflectionEdge: "#E5E8E8",
    reflectionShadow: "#59636C",
    reflectionFloor: "#A8AFAC",
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

export function createChromeResponseTexture() {
  const width = 256;
  const height = 256;
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
