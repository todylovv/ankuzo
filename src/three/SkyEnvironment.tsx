import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { CubeTexture, PMREMGenerator, SRGBColorSpace } from "three";

function makeFace(size: number, paint: (ctx: CanvasRenderingContext2D, n: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) paint(ctx, size);
  return canvas;
}

function fill(ctx: CanvasRenderingContext2D, n: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, n, n);
}

function cloud(
  ctx: CanvasRenderingContext2D,
  n: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha = 1,
) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(n * x, n * y, n * rx, n * ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function strip(ctx: CanvasRenderingContext2D, n: number, x: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(n * x, 0, n * w, n);
}

function skyCube(size: number) {
  const px = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#c5d2dc");
    cloud(ctx, n, 0.32, 0.36, 0.3, 0.16, 1);
    cloud(ctx, n, 0.7, 0.58, 0.22, 0.12, 1);
    strip(ctx, n, 0.88, 0.05, "#ffffff");
  });
  const nx = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#b7c8d6");
    cloud(ctx, n, 0.48, 0.42, 0.28, 0.14, 1);
    strip(ctx, n, 0.08, 0.035, "#ffffff");
  });
  const py = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#eef3f7");
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(n * 0.36, n * 0.32, n * 0.24, 0, Math.PI * 2);
    ctx.fill();
    cloud(ctx, n, 0.7, 0.6, 0.28, 0.14, 1);
  });
  const ny = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#2a3036");
  });
  const pz = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#c8d6e2");
    strip(ctx, n, 0.14, 0.055, "#ffffff");
    cloud(ctx, n, 0.52, 0.28, 0.24, 0.12, 1);
  });
  const nz = makeFace(size, (ctx, n) => {
    fill(ctx, n, "#9eb4c4");
    cloud(ctx, n, 0.5, 0.48, 0.2, 0.1, 0.9);
  });

  const cube = new CubeTexture([px, nx, py, ny, pz, nz]);
  cube.needsUpdate = true;
  cube.colorSpace = SRGBColorSpace;
  return cube;
}

export function SkyEnvironment() {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    pmrem.compileCubemapShader();
    const cube = skyCube(512);
    const envMap = pmrem.fromCubemap(cube).texture;
    // oxlint-disable-next-line react/immutability -- Three.js scenes expose mutable render state by design.
    scene.environment = envMap;
    scene.environmentIntensity = 1.25;

    return () => {
      scene.environment = null;
      envMap.dispose();
      cube.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}
