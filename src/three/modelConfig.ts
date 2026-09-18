export type Vec3 = [number, number, number];

export type ModelTransform = {
  position: Vec3;
  rotation: Vec3;
  scale: number | Vec3;
};

export const MODEL_PATHS = {
  ankuzo: "/models/ankuzo.glb",
  twentyTwo: "/models/22.glb",
} as const;

export const HERO_SKY_PATH = "/images/hero-sky.jpg?v=chatgpt";

export const cameraConfig = {
  position: [0, 0.18, 10.4] as Vec3,
  fov: 30,
  near: 0.1,
  far: 50,
};

export const ankuzoTransform: ModelTransform = {
  position: [-2.45, 0.28, 0],
  rotation: [0.1, 0.34, -0.045],
  scale: 1.93,
};

export const twentyTwoTransform: ModelTransform = {
  position: [5.4, 0.7, -0.12],
  rotation: [0.05, -0.18, 0.03],
  scale: 0.69,
};

export const lightingConfig = {
  exposure: 1.06,
  ambientIntensity: 0.1,
  envMapIntensity: 1.35,
  key: {
    position: [-5, 9, 7] as Vec3,
    intensity: 1.15,
    color: "#ffffff",
  },
  fill: {
    position: [6, 2, 3] as Vec3,
    intensity: 0.28,
    color: "#a8c4d8",
  },
  rim: {
    position: [2, 5, -7] as Vec3,
    intensity: 0.22,
    color: "#ffffff",
  },
};

export const chromeMaterialConfig = {
  color: "#f2f5f8",
  metalness: 0.96,
  roughness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  reflectivity: 1,
  envMapIntensity: lightingConfig.envMapIntensity,
  specularColor: "#d7eaf6",
};

export const placeholderBounds = {
  ankuzo: { width: 5.35, height: 1.38, depth: 0.72 },
  twentyTwo: { width: 2.55, height: 2.15, depth: 0.72 },
};

export const motionConfig = {
  parallaxX: 0.1,
  parallaxY: 0.045,
  floatAmplitude: 0.055,
  floatSpeed: 0.65,
};

export const FONT_3D_PATH = "/fonts/helvetiker_bold.typeface.json";
