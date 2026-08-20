"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, SRGBColorSpace, Texture, TextureLoader } from "three";
import type { GameIdentity } from "../../lib/experience-data";
import { useGothicTwoGeometry } from "./GothicTwo";
import { DARK_PALETTE, getChromeResponseTexture, LIGHT_PALETTE, mixColor, mixNumber } from "./theme";

type MediaState = {
  p: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  rx?: number;
  ry?: number;
  rz?: number;
  opacity: number;
  shade?: number;
};

const TRACKS: MediaState[][] = [
  [
    { p: 0, x: 0.45, y: 0, z: -14.5, sx: 6.3, sy: 3.55, opacity: 0.12 },
    { p: 0.22, x: 0.35, y: 0, z: -14.35, sx: 7.4, sy: 4.15, opacity: 1 },
    { p: 0.33, x: -1.75, y: 0.08, z: -13.85, sx: 7.8, sy: 4.35, ry: 0.05, opacity: 1 },
    { p: 0.43, x: -4.15, y: 0.28, z: -14.8, sx: 5.5, sy: 3.1, ry: 0.16, opacity: 0.76 },
    { p: 0.5, x: -3.35, y: 0.5, z: -13.9, sx: 5.1, sy: 2.9, ry: 0.1, opacity: 0.95 },
    { p: 0.59, x: 0, y: 0, z: -13.55, sx: 8.15, sy: 4.55, opacity: 1 },
    { p: 0.68, x: 0, y: 0, z: -13.15, sx: 8.55, sy: 4.75, opacity: 0.86, shade: 0.72 },
    { p: 0.75, x: 0, y: 0, z: -13.35, sx: 8.0, sy: 4.45, opacity: 0.62, shade: 0.48 },
    { p: 0.84, x: 0, y: 0, z: -13.58, sx: 7.4, sy: 4.05, opacity: 0.25, shade: 0.23 },
    { p: 0.9, x: 0, y: 0, z: -13.8, sx: 6.6, sy: 3.55, opacity: 0.12, shade: 0.16 },
    { p: 1, x: -2.25, y: 0, z: -14.25, sx: 0.24, sy: 3.5, rz: -0.16, opacity: 0.2, shade: 0.14 },
  ],
  [
    { p: 0, x: -3.2, y: 1.25, z: -19, sx: 3.8, sy: 2.15, ry: -0.15, opacity: 0.05 },
    { p: 0.22, x: -3.15, y: 1.15, z: -18, sx: 4.4, sy: 2.5, ry: -0.13, opacity: 0.35 },
    { p: 0.33, x: 2.45, y: -0.2, z: -14.2, sx: 6.5, sy: 3.65, ry: -0.08, opacity: 0.9 },
    { p: 0.43, x: 3.55, y: -0.32, z: -14.05, sx: 5.5, sy: 3.05, ry: -0.12, opacity: 1 },
    { p: 0.5, x: 3.2, y: -0.5, z: -14.35, sx: 4.8, sy: 2.7, ry: -0.13, opacity: 0.95 },
    { p: 0.59, x: -2.8, y: 0.45, z: -16.8, sx: 4.2, sy: 2.35, ry: 0.12, opacity: 0.28 },
    { p: 0.68, x: -3.2, y: 0.55, z: -17.3, sx: 4.0, sy: 2.25, ry: 0.15, opacity: 0.16, shade: 0.42 },
    { p: 0.75, x: -2.9, y: 0.9, z: -15.8, sx: 3.3, sy: 1.85, rz: 0.04, opacity: 0.22, shade: 0.3 },
    { p: 0.84, x: -3.2, y: 1.25, z: -14.1, sx: 2.7, sy: 0.28, rz: 0.08, opacity: 0.52, shade: 0.25 },
    { p: 0.9, x: -2.25, y: 1.05, z: -14, sx: 2.1, sy: 0.2, rz: 0.38, opacity: 0.58, shade: 0.16 },
    { p: 1, x: -1.45, y: 1.55, z: -14.2, sx: 0.22, sy: 2.3, rz: -0.7, opacity: 0.2, shade: 0.12 },
  ],
  [
    { p: 0, x: 4.8, y: -0.5, z: -17.5, sx: 3.5, sy: 1.95, ry: 0.2, opacity: 0.04 },
    { p: 0.22, x: 4.4, y: -0.55, z: -16.8, sx: 4.1, sy: 2.3, ry: 0.18, opacity: 0.3 },
    { p: 0.33, x: 4.75, y: 0.7, z: -17.1, sx: 4.2, sy: 2.35, ry: 0.19, opacity: 0.34 },
    { p: 0.43, x: 0.4, y: 1.0, z: -16.1, sx: 4.5, sy: 2.55, ry: 0.03, opacity: 0.48 },
    { p: 0.5, x: -0.9, y: -0.75, z: -15.2, sx: 4.7, sy: 2.65, ry: 0.05, opacity: 0.68 },
    { p: 0.59, x: 3.0, y: -0.45, z: -16.5, sx: 4.0, sy: 2.25, ry: -0.14, opacity: 0.28 },
    { p: 0.68, x: 3.45, y: -0.5, z: -17.2, sx: 3.7, sy: 2.08, ry: -0.18, opacity: 0.15, shade: 0.4 },
    { p: 0.75, x: 3.1, y: -1.0, z: -15.6, sx: 3.1, sy: 1.75, rz: -0.05, opacity: 0.22, shade: 0.28 },
    { p: 0.84, x: 3.1, y: -1.15, z: -14.05, sx: 2.5, sy: 0.25, rz: -0.09, opacity: 0.5, shade: 0.23 },
    { p: 0.9, x: 2.3, y: -0.9, z: -14, sx: 2.0, sy: 0.18, rz: -0.4, opacity: 0.58, shade: 0.16 },
    { p: 1, x: 1.45, y: -1.55, z: -14.2, sx: 0.22, sy: 2.3, rz: -0.7, opacity: 0.2, shade: 0.12 },
  ],
  [
    { p: 0, x: 0, y: -2.3, z: -21, sx: 3.2, sy: 1.8, opacity: 0 },
    { p: 0.22, x: 0, y: -2.2, z: -19.5, sx: 3.5, sy: 1.95, opacity: 0.08 },
    { p: 0.33, x: -4.5, y: -1.25, z: -17, sx: 3.7, sy: 2.1, ry: -0.2, opacity: 0.25 },
    { p: 0.43, x: -1.7, y: -0.95, z: -15.8, sx: 4.3, sy: 2.4, ry: -0.08, opacity: 0.44 },
    { p: 0.5, x: 0.7, y: 0.85, z: -15.5, sx: 4.4, sy: 2.45, ry: -0.04, opacity: 0.58 },
    { p: 0.59, x: 0, y: -1.7, z: -18.3, sx: 3.4, sy: 1.9, opacity: 0.12 },
    { p: 0.68, x: 0, y: -1.9, z: -18.8, sx: 3.1, sy: 1.75, opacity: 0.07, shade: 0.35 },
    { p: 0.75, x: 0, y: -1.55, z: -16.4, sx: 3.0, sy: 1.65, opacity: 0.16, shade: 0.25 },
    { p: 0.84, x: 0, y: 1.65, z: -14.15, sx: 3.2, sy: 0.23, opacity: 0.48, shade: 0.22 },
    { p: 0.9, x: 0, y: -1.6, z: -14, sx: 3.0, sy: 0.18, opacity: 0.56, shade: 0.15 },
    { p: 1, x: 0, y: -1.65, z: -14.2, sx: 3.1, sy: 0.14, opacity: 0.2, shade: 0.1 },
  ],
];

function ease(value: number) {
  return value * value * (3 - 2 * value);
}

function lerp(a = 0, b = 0, t: number) {
  return a + (b - a) * t;
}

// Reused across the four per-frame samples so the loop stays allocation-free.
const SAMPLED: MediaState = {
  p: 0, x: 0, y: 0, z: 0, sx: 0, sy: 0, rx: 0, ry: 0, rz: 0, opacity: 0, shade: 1,
};

function sample(track: MediaState[], progress: number) {
  const endIndex = track.findIndex((state) => state.p >= progress);
  if (endIndex === -1) return track[track.length - 1];
  if (endIndex === 0) return track[0];
  const start = track[endIndex - 1];
  const end = track[endIndex];
  const t = ease((progress - start.p) / (end.p - start.p));
  SAMPLED.p = progress;
  SAMPLED.x = lerp(start.x, end.x, t);
  SAMPLED.y = lerp(start.y, end.y, t);
  SAMPLED.z = lerp(start.z, end.z, t);
  SAMPLED.sx = lerp(start.sx, end.sx, t);
  SAMPLED.sy = lerp(start.sy, end.sy, t);
  SAMPLED.rx = lerp(start.rx, end.rx, t);
  SAMPLED.ry = lerp(start.ry, end.ry, t);
  SAMPLED.rz = lerp(start.rz, end.rz, t);
  SAMPLED.opacity = lerp(start.opacity, end.opacity, t);
  SAMPLED.shade = lerp(start.shade ?? 1, end.shade ?? 1, t);
  return SAMPLED;
}

function cropTexture(source: Texture, index: number) {
  const texture = source.clone();
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(0.165, 0.96);
  texture.offset.set(index * 0.166 + 0.004, 0.02);
  texture.needsUpdate = true;
  return texture;
}

function coverTexture(texture: Texture, targetAspect = 0.72) {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const width = image?.width ?? 1;
  const height = image?.height ?? 1;
  const imageAspect = width / Math.max(1, height);
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (imageAspect > targetAspect) {
    texture.repeat.x = targetAspect / imageAspect;
    texture.offset.x = (1 - texture.repeat.x) * 0.5;
  } else {
    texture.repeat.y = imageAspect / targetAspect;
    texture.offset.y = (1 - texture.repeat.y) * 0.5;
  }
  texture.needsUpdate = true;
  return texture;
}

function useRemoteMedia(urls: Array<string | undefined>) {
  // The loaded set is stamped with the url key it belongs to, so a url change
  // falls back to the placeholder slots without a state write inside the effect.
  const key = urls.join("|");
  const [loaded, setLoaded] = useState<{ key: string; textures: Array<Texture | null> }>(
    () => ({ key, textures: urls.map(() => null) }),
  );
  const empty = useMemo(() => urls.map(() => null), [urls]);
  const retired = useRef<Texture[]>([]);

  useEffect(() => {
    let active = true;
    const owned: Texture[] = [];
    const loader = new TextureLoader();
    urls.forEach((url, index) => {
      if (!url) return;
      loader.load(url, (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        const prepared = coverTexture(texture);
        owned.push(prepared);
        setLoaded((current) => {
          const textures = current.key === key ? [...current.textures] : urls.map(() => null);
          textures[index] = prepared;
          return { key, textures };
        });
      }, undefined, () => undefined);
    });
    return () => {
      active = false;
      // Disposing here would free GL textures still bound to a live material;
      // ownership is handed to the caller, which releases them after the swap.
      retired.current.push(...owned);
    };
  }, [urls, key]);

  const releaseRetired = useCallback(() => {
    retired.current.forEach((texture) => texture.dispose());
    retired.current = [];
  }, []);

  return {
    textures: loaded.key === key ? loaded.textures : empty,
    releaseRetired,
  };
}

export function ContinuousWorld({
  progress,
  themeProgress,
  games,
}: {
  progress: MutableRefObject<number>;
  themeProgress: MutableRefObject<number>;
  games: GameIdentity[];
}) {
  const source = useTexture("/assets/library-atlas.webp");
  const textures = useMemo(() => [0, 1, 3, 5].map((index) => cropTexture(source, index)), [source]);
  const media = useRef<Array<Mesh | null>>([]);
  const materials = useRef<Array<MeshBasicMaterial | null>>([]);
  const remoteUrls = useMemo(() => {
    const steam = games.filter((game) => game.platform === "steam").slice(0, 2);
    const playstation = games.filter((game) => game.platform === "playstation").slice(0, 2);
    return [steam[0], playstation[0], steam[1], playstation[1]]
      .map((game) => game?.artwork ?? game?.icon);
  }, [games]);
  const { textures: remoteMedia, releaseRetired } = useRemoteMedia(remoteUrls);
  const finalGroup = useRef<Group>(null);
  const chromeResponse = getChromeResponseTexture();
  const finalMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: LIGHT_PALETTE.chrome, map: chromeResponse, roughnessMap: chromeResponse,
    metalness: 0.98, roughness: 0.115, envMapIntensity: 2.35,
    clearcoat: 0.08, clearcoatRoughness: 0.09, transparent: true, opacity: 0,
  }), [chromeResponse]);
  const finalSideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: LIGHT_PALETTE.chromeSide, metalness: 0.96, roughness: 0.19, envMapIntensity: 1.85,
    clearcoat: 0.04, clearcoatRoughness: 0.16, transparent: true, opacity: 0,
  }), []);
  const geometry = useGothicTwoGeometry();
  const { size } = useThree();
  const portrait = size.width / size.height < 0.78;

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => {
    finalMaterial.dispose();
    finalSideMaterial.dispose();
  }, [finalMaterial, finalSideMaterial]);
  useEffect(() => {
    materials.current.forEach((material, index) => {
      if (!material) return;
      material.map = remoteMedia[index] ?? textures[index];
      material.needsUpdate = true;
    });
    // Only now that nothing points at them are the previous textures freed.
    releaseRetired();
  }, [remoteMedia, textures, releaseRetired]);
  useEffect(() => () => releaseRetired(), [releaseRetired]);

  useFrame(() => {
    const value = progress.current;
    const theme = themeProgress.current;
    mixColor(finalMaterial.color, LIGHT_PALETTE.chrome, DARK_PALETTE.chrome, theme);
    finalMaterial.roughness = mixNumber(0.115, 0.105, theme);
    finalMaterial.envMapIntensity = mixNumber(2.35, 2.55, theme);
    mixColor(finalSideMaterial.color, LIGHT_PALETTE.chromeSide, DARK_PALETTE.chromeSide, theme);
    finalSideMaterial.roughness = mixNumber(0.19, 0.16, theme);
    finalSideMaterial.envMapIntensity = mixNumber(1.85, 2.05, theme);
    const displayTransform = ease(Math.min(1, Math.max(0, (value - 0.53) / 0.1)));
    const identityCollapse = ease(Math.min(1, Math.max(0, (value - 0.9) / 0.1)));
    textures[0].repeat.x = 0.165 + displayTransform * 0.61;
    textures[0].offset.x = 0.004 + displayTransform * 0.02;
    TRACKS.forEach((track, index) => {
      const mesh = media.current[index];
      const material = materials.current[index];
      if (!mesh || !material) return;
      const state = sample(track, value);
      const mobileX = portrait ? state.x * 0.58 : state.x;
      const mobileScale = portrait ? 0.82 : 1;
      const baseAspect = index === 0 ? 0.72 + displayTransform * 1.02 : 0.72;
      const aspect = baseAspect + (0.07 - baseAspect) * identityCollapse;
      mesh.position.set(mobileX, state.y * (portrait ? 0.82 : 1), state.z + (portrait ? 0.8 : 0));
      mesh.scale.set(state.sy * aspect * mobileScale, state.sy * mobileScale, 1);
      mesh.rotation.set(state.rx ?? 0, state.ry ?? 0, state.rz ?? 0);
      material.opacity = state.opacity;
      material.color.setScalar(state.shade ?? 1);
      mesh.visible = state.opacity > 0.005;
    });

    const finalReveal = ease(Math.min(1, Math.max(0, (value - 0.91) / 0.09)));
    finalMaterial.opacity = finalReveal;
    finalMaterial.visible = finalReveal > 0.005;
    finalSideMaterial.opacity = finalReveal;
    finalSideMaterial.visible = finalReveal > 0.005;
    if (finalGroup.current) {
      finalGroup.current.visible = finalReveal > 0.005;
      finalGroup.current.rotation.y = (1 - finalReveal) * 0.16;
      finalGroup.current.position.z = -14.35 + (1 - finalReveal) * -0.5;
    }
  });

  const finalScale = portrait ? 0.43 : 0.47;
  const finalOffset = portrait ? 1.02 : 1.35;

  return (
    <>
      {textures.map((texture, index) => (
        <mesh key={index} ref={(node) => { media.current[index] = node; }}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={(node) => { materials.current[index] = node; }} map={texture} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
      <group ref={finalGroup} position={[0, 0, -14.35]} visible={false}>
        <mesh geometry={geometry} material={[finalMaterial, finalSideMaterial]} position={[-finalOffset, 0, 0]} scale={finalScale} />
        <mesh geometry={geometry} material={[finalMaterial, finalSideMaterial]} position={[finalOffset, 0, 0]} scale={finalScale} />
      </group>
    </>
  );
}
