"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Group, MeshPhysicalMaterial } from "three";
import { useGothicTwoGeometry } from "./GothicTwo";
import { SCENE } from "./theme";

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

/** Where the artefact fades in, and where the ending begins. The chapter
 *  boundaries themselves now live in ARTEFACT_PATH, one anchor each. */
const STEAM_START = 0.225;
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

/**
 * Where the artefact sits at each hand-off. Five anchors rather than a formula,
 * because this is a piece of choreography and choreography is authored: the
 * object has to be on the opposite side from whichever rail the type is using.
 */
const ARTEFACT_PATH = [
  { p: 0.19, x: 2.6, y: 0.15, z: -16.2, ry: -0.42 },
  { p: 0.34, x: 1.95, y: 0.1, z: -15.1, ry: -0.3 },
  { p: 0.45, x: 1.8, y: 0.05, z: -15, ry: -0.24 },
  // PLAYSTATION mirrors: type moves right, so the artefact crosses to the left.
  { p: 0.58, x: -2.05, y: 0.02, z: -15.2, ry: 0.28 },
  { p: 0.66, x: -1.9, y: 0, z: -15.4, ry: 0.34 },
  // PRESENCE: back to the right and further away — the quiet chapter.
  { p: 0.78, x: 1.75, y: -0.25, z: -17.4, ry: -0.3 },
  { p: 0.86, x: 1.6, y: -0.3, z: -17.8, ry: -0.26 },
  // The ending brings it home, centred and closer than anywhere else.
  { p: 1, x: 0, y: 0, z: -13.4, ry: 0 },
] as const;

export function ContinuousWorld({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const faceMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chrome,
    metalness: 0.98, roughness: 0.115, envMapIntensity: 2.35,
    clearcoat: 0.08, clearcoatRoughness: 0.09, transparent: true, opacity: 0,
  }), []);
  const sideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chromeSide, metalness: 0.96, roughness: 0.19, envMapIntensity: 1.85,
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

    faceMaterial.color.set(SCENE.chrome);
    faceMaterial.roughness = 0.115;
    faceMaterial.envMapIntensity = 2.35;
    sideMaterial.color.set(SCENE.chromeSide);
    sideMaterial.roughness = 0.19;
    sideMaterial.envMapIntensity = 1.85;

    // The artefact appears once the portal has been crossed and never leaves.
    const arrival = ease(span(value, STEAM_START - 0.03, STEAM_START + 0.05));
    faceMaterial.opacity = arrival;
    sideMaterial.opacity = arrival;

    if (!group.current) return;
    group.current.visible = arrival > 0.005;

    // The artefact crosses the frame instead of sitting on one side. It stays
    // opposite the type: right while STEAM holds the left rail, left once
    // PLAYSTATION mirrors to the right, right again for PRESENCE, and centred
    // for the ending. The swap is the reason the chapters read as a sequence
    // rather than as three versions of one screen.
    const path = ARTEFACT_PATH;
    let index = 1;
    while (index < path.length - 1 && value > path[index].p) index += 1;
    const from = path[index - 1];
    const to = path[index];
    const t = ease(span(value, from.p, to.p));

    const sideways = portrait ? 0.62 : 1;
    group.current.position.set(
      (from.x + (to.x - from.x) * t) * sideways,
      from.y + (to.y - from.y) * t,
      from.z + (to.z - from.z) * t,
    );
    // Always angled back toward the reader's side of the frame.
    group.current.rotation.y = from.ry + (to.ry - from.ry) * t;
    group.current.rotation.x = 0.03 * Math.sin((value - STEAM_START) * 2.2);

    // Largest at the ending, where it is the only thing left in the frame.
    const scale = (portrait ? 0.34 : 0.38) + 0.14 * ease(span(value, FINAL_START, 1));
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
