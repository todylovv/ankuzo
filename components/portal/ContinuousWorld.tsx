"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Group, MeshPhysicalMaterial } from "three";
import { useGothicTwoGeometry } from "./GothicTwo";
import { DARK_PALETTE, getChromeResponseTexture, LIGHT_PALETTE, mixColor, mixNumber } from "./theme";

/**
 * Everything after the portal is carried by the artefact and by type — there is
 * no borrowed imagery in the scene at all.
 *
 * The previous version flew four game covers along four hand-tuned tracks. It
 * could not be rescued by tuning: cover art is drawn in other people's palettes
 * (an orange Counter-Strike beside an acid-green Apex) and destroys the site's
 * colour discipline the moment it enters frame. The numbers behind those games
 * are far stronger material — five thousand hours reads as a fact, a cover
 * reads as someone else's poster.
 */

const STEAM: readonly [number, number] = [0.225, 0.45];
const PLAYSTATION: readonly [number, number] = [0.45, 0.66];
const PRESENCE: readonly [number, number] = [0.66, 0.86];
const FINAL_START = 0.86;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function span(value: number, from: number, to: number) {
  return clamp01((value - from) / (to - from));
}

function ease(value: number) {
  return value * value * (3 - 2 * value);
}

export function ContinuousWorld({
  progress,
  themeProgress,
}: {
  progress: MutableRefObject<number>;
  themeProgress: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const chromeResponse = getChromeResponseTexture();
  const faceMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: LIGHT_PALETTE.chrome, map: chromeResponse, roughnessMap: chromeResponse,
    metalness: 0.98, roughness: 0.115, envMapIntensity: 2.35,
    clearcoat: 0.08, clearcoatRoughness: 0.09, transparent: true, opacity: 0,
  }), [chromeResponse]);
  const sideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: LIGHT_PALETTE.chromeSide, metalness: 0.96, roughness: 0.19, envMapIntensity: 1.85,
    clearcoat: 0.04, clearcoatRoughness: 0.16, transparent: true, opacity: 0,
  }), []);
  const geometry = useGothicTwoGeometry();
  const { size } = useThree();
  const portrait = size.width / size.height < 0.78;

  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => {
    faceMaterial.dispose();
    sideMaterial.dispose();
  }, [faceMaterial, sideMaterial]);

  useFrame(() => {
    const value = progress.current;
    const theme = themeProgress.current;

    mixColor(faceMaterial.color, LIGHT_PALETTE.chrome, DARK_PALETTE.chrome, theme);
    faceMaterial.roughness = mixNumber(0.115, 0.105, theme);
    faceMaterial.envMapIntensity = mixNumber(2.35, 2.55, theme);
    mixColor(sideMaterial.color, LIGHT_PALETTE.chromeSide, DARK_PALETTE.chromeSide, theme);
    sideMaterial.roughness = mixNumber(0.19, 0.16, theme);
    sideMaterial.envMapIntensity = mixNumber(1.85, 2.05, theme);

    // The artefact appears once the portal has been crossed and never leaves.
    const arrival = ease(span(value, STEAM[0] - 0.03, STEAM[0] + 0.05));
    faceMaterial.opacity = arrival;
    sideMaterial.opacity = arrival;

    if (!group.current) return;
    group.current.visible = arrival > 0.005;

    // One continuous move across the three data chapters: the artefact drifts
    // right and recedes as the numbers get quieter, then returns to centre for
    // the ending. Type owns the left rail throughout, so it never crosses it.
    const steam = ease(span(value, STEAM[0], STEAM[1]));
    const playstation = ease(span(value, PLAYSTATION[0], PLAYSTATION[1]));
    const presence = ease(span(value, PRESENCE[0], PRESENCE[1]));
    const ending = ease(span(value, FINAL_START, 1));

    const sideways = portrait ? 0.55 : 1;
    group.current.position.set(
      (1.55 + 0.35 * steam + 0.2 * playstation - 0.25 * presence) * sideways * (1 - ending),
      (0.1 - 0.35 * presence) * (1 - ending),
      -14.6 - 0.9 * steam - 0.6 * playstation - 1.9 * presence + 2.4 * ending,
    );
    group.current.rotation.y = -0.34 + 0.2 * steam + 0.16 * playstation + 0.1 * presence - 0.22 * ending;
    group.current.rotation.x = 0.04 * playstation - 0.03 * presence;

    const scale = (portrait ? 0.34 : 0.38) + 0.16 * ending;
    group.current.scale.setScalar(scale);
  });

  const offset = portrait ? 1.02 : 1.35;

  return (
    <group ref={group} visible={false}>
      <mesh geometry={geometry} material={[faceMaterial, sideMaterial]} position={[-offset, 0, 0]} />
      <mesh geometry={geometry} material={[faceMaterial, sideMaterial]} position={[offset, 0, 0]} />
    </group>
  );
}
