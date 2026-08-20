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

// Chapter windows in master progress. Each chapter owns its own material and
// hands nothing over to the next one: reusing a plane across chapters is what
// made ONLINE read as a zoomed library cover rather than a place of its own.
const LIBRARY: readonly [number, number] = [0.2, 0.45];
const PLATFORMS: readonly [number, number] = [0.45, 0.6];
const BUILD: readonly [number, number] = [0.76, 0.91];

// The strip: one axis, one spacing, one reading position. Everything about a
// cover's place in the frame follows from its index and the scroll, so no two
// covers can drift into each other the way four hand-tuned tracks did.
const STRIP_COUNT = 6;
const STRIP_STEP = 5.4;
const STRIP_X = 2.45;
const STRIP_READ_Z = -12.6;
const STRIP_NEAR_Z = -7.4;
const STRIP_FAR_Z = -40;

type MediaState = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  ry: number;
  opacity: number;
  shade: number;
};

// Reused every frame so the loop stays allocation-free.
const SAMPLED: MediaState = { x: 0, y: 0, z: 0, sx: 0, sy: 0, ry: 0, opacity: 0, shade: 1 };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function span(value: number, from: number, to: number) {
  return clamp01((value - from) / (to - from));
}

function ease(value: number) {
  return value * value * (3 - 2 * value);
}

/**
 * Advance in beats instead of at a constant rate: each cover travels into the
 * reading position, then the strip holds still while it can actually be read.
 * The hold is the whole point — a frame that never stops never resolves.
 */
function beatEase(t: number, beats: number) {
  const scaled = clamp01(t) * beats;
  const index = Math.min(beats - 1, Math.floor(scaled));
  const local = scaled - index;
  const MOVE = 0.58;
  const advanced = local < MOVE ? ease(local / MOVE) : 1;
  return (index + advanced) / beats;
}

/** Fade a plane in from the far end of the strip and out as it passes camera. */
function stripOpacity(z: number) {
  return span(z, STRIP_FAR_Z, STRIP_FAR_Z + 9) * (1 - span(z, STRIP_NEAR_Z - 3.5, STRIP_NEAR_Z));
}

/**
 * Where plane `index` sits at this scroll position. One function for the whole
 * journey: the chapter decides the arrangement, the index decides the slot.
 */
function layout(index: number, progress: number, out: MediaState) {
  out.x = 0; out.y = 0; out.z = STRIP_READ_Z; out.sx = 0; out.sy = 0;
  out.ry = 0; out.opacity = 0; out.shade = 1;

  // LIBRARY — a film strip travelling past the camera, one cover at a time.
  if (progress < PLATFORMS[0]) {
    const travelled = beatEase(span(progress, LIBRARY[0], LIBRARY[1]), STRIP_COUNT + 1);
    const z = STRIP_READ_Z - (index + 1) * STRIP_STEP + travelled * (STRIP_COUNT + 1) * STRIP_STEP;
    // Sharp and bright only in the reading position; neighbours recede.
    const focus = clamp01(1 - Math.abs(z - STRIP_READ_Z) / STRIP_STEP);
    out.x = STRIP_X;
    out.z = z;
    out.sy = 3.15;
    out.sx = 3.15 * 0.72;
    out.ry = -0.14;
    out.opacity = stripOpacity(z);
    out.shade = 0.3 + 0.7 * focus;
    return out;
  }

  // PLATFORMS — two masses only, mirrored, converging. No strip, no third item.
  if (progress < PLATFORMS[1]) {
    if (index > 1) return out;
    const t = ease(span(progress, PLATFORMS[0], PLATFORMS[1]));
    const side = index === 0 ? -1 : 1;
    out.x = side * (3.5 - 2.5 * t);
    out.z = -13.4;
    out.sy = 3.3;
    out.sx = 3.3 * 0.72;
    out.ry = side * -0.1 * (1 - t);
    out.opacity = span(progress, PLATFORMS[0], PLATFORMS[0] + 0.03)
      * (1 - span(progress, PLATFORMS[1] - 0.04, PLATFORMS[1]));
    out.shade = 0.85;
    return out;
  }

  // ONLINE — deliberately empty. After a dense strip and two masses, an empty
  // frame is the loudest thing available; it is also the chapter's own material.
  if (progress < BUILD[0]) return out;

  // BUILD — a single narrow column, code treated as printed matter.
  if (progress < BUILD[1]) {
    if (index !== 0) return out;
    const t = span(progress, BUILD[0], BUILD[1]);
    out.x = 2.15;
    out.y = 0;
    out.z = -13.1;
    out.sy = 4.6;
    out.sx = 0.62;
    out.opacity = span(t, 0, 0.12) * (1 - span(t, 0.86, 1));
    out.shade = 0.55;
    return out;
  }

  return out;
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
  const textures = useMemo(
    () => Array.from({ length: STRIP_COUNT }, (_, index) => cropTexture(source, index)),
    [source],
  );
  const media = useRef<Array<Mesh | null>>([]);
  const materials = useRef<Array<MeshBasicMaterial | null>>([]);
  // The strip alternates platforms so the library reads as one life across two
  // machines rather than a Steam block followed by a PlayStation block.
  const remoteUrls = useMemo(() => {
    const steam = games.filter((game) => game.platform === "steam");
    const playstation = games.filter((game) => game.platform === "playstation");
    return Array.from({ length: STRIP_COUNT }, (_, index) => {
      const source = index % 2 === 0 ? steam : playstation;
      const game = source[Math.floor(index / 2)];
      return game?.artwork ?? game?.icon;
    });
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
    const identityCollapse = ease(span(value, 0.9, 1));
    for (let index = 0; index < STRIP_COUNT; index += 1) {
      const mesh = media.current[index];
      const material = materials.current[index];
      if (!mesh || !material) continue;
      const state = layout(index, value, SAMPLED);
      const visible = state.opacity > 0.005;
      mesh.visible = visible;
      if (!visible) continue;
      const shrink = 1 - identityCollapse;
      mesh.position.set(
        portrait ? state.x * 0.58 : state.x,
        state.y * (portrait ? 0.82 : 1),
        state.z + (portrait ? 0.8 : 0),
      );
      const scale = portrait ? 0.82 : 1;
      mesh.scale.set(state.sx * scale * shrink, state.sy * scale * shrink, 1);
      mesh.rotation.set(0, state.ry, 0);
      material.opacity = state.opacity;
      material.color.setScalar(state.shade);
    }

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
