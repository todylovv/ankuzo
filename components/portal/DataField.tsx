"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F
   drives Three.js imperatively: the point buffer is written in place each frame and
   uploaded via needsUpdate, which is the documented way to animate geometry. */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from "three";
import { SCENE } from "./theme";

/**
 * The room's atmosphere, made of the same material as its content.
 *
 * One point per record in the libraries — not a decorative starfield. The
 * count is the count: every Steam game and every PlayStation title is in
 * there, so the depth behind the artefact is literally the size of the
 * archive. That is the only reason a moving background earns its place on a
 * page whose whole argument is that the data is the material.
 *
 * It is deliberately dim and slow. A background that competes with the subject
 * is not atmosphere, it is noise, and this site already decided that each
 * frame holds exactly one subject.
 */

/** Deterministic, so the field is identical on every visit and every reload. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const NEAR_Z = -19;
const FAR_Z = -52;

function buildField(count: number, warmShare: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const drift = new Float32Array(count);
  const random = seeded(220222);
  const cold = new Color(SCENE.reflectionSide);
  const bright = new Color(SCENE.chromeHighlight);
  const warm = new Color(SCENE.reflectionWarm);
  const shade = new Color();

  for (let index = 0; index < count; index += 1) {
    // Spread wide and deep; the near plane stays clear of the artefact so the
    // field never reads as dirt sitting on the glyph.
    const depth = random();
    const z = NEAR_Z + (FAR_Z - NEAR_Z) * depth;
    // Wider the further back, so perspective keeps the density even on screen.
    const spread = 11 + depth * 20;
    positions[index * 3] = (random() - 0.5) * spread;
    positions[index * 3 + 1] = (random() - 0.5) * spread * 0.62;
    positions[index * 3 + 2] = z;

    // A few carry the warm accent — the same one the authored voice uses — so
    // the field belongs to the palette instead of being uniformly blue.
    const roll = random();
    shade.copy(roll < warmShare ? warm : roll > 0.93 ? bright : cold);
    // Nearer points are brighter; the far ones fall away into the fog.
    shade.multiplyScalar(0.35 + (1 - depth) * 0.65);
    colors[index * 3] = shade.r;
    colors[index * 3 + 1] = shade.g;
    colors[index * 3 + 2] = shade.b;

    drift[index] = 0.15 + random() * 0.85;
  }

  return { positions, colors, drift };
}

export function DataField({
  progress,
  count,
  warmShare = 0.06,
}: {
  progress: MutableRefObject<number>;
  /** One point per record. Falls back to a plausible archive before data lands. */
  count: number;
  warmShare?: number;
}) {
  const points = useRef<Points>(null);
  const safeCount = Math.max(120, Math.min(1200, Math.round(count)));

  const { geometry, material, drift } = useMemo(() => {
    const field = buildField(safeCount, warmShare);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(field.positions, 3));
    geo.setAttribute("color", new BufferAttribute(field.colors, 3));
    const mat = new PointsMaterial({
      size: 0.062,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return { geometry: geo, material: mat, drift: field.drift };
  }, [safeCount, warmShare]);

  // Built by hand rather than declaratively, so it has to be released by hand.
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    const value = progress.current;
    const node = points.current;
    if (!node) return;

    // Absent during the portal — the flight through the glyph is its own thing
    // and does not need company — then present for the rest of the journey.
    const arrival = Math.min(1, Math.max(0, (value - 0.2) / 0.08));
    // PRESENCE is the empty chapter, so the field is at its strongest exactly
    // where nothing else is on screen. Emptiness with texture still reads as a
    // pause; emptiness with nothing in it reads as a missing asset.
    const quiet = Math.min(1, Math.max(0, (value - 0.62) / 0.1))
      * (1 - Math.min(1, Math.max(0, (value - 0.84) / 0.06)));
    material.opacity = arrival * (0.4 + quiet * 0.45);

    // Very slow lateral drift plus a breath, both tied to real time rather than
    // to scroll, so the room stays alive while the reader is standing still.
    const t = state.clock.elapsedTime;
    node.position.x = Math.sin(t * 0.045) * 0.7;
    node.position.y = Math.cos(t * 0.032) * 0.4;
    node.rotation.z = t * 0.006;

    const positions = geometry.getAttribute("position") as BufferAttribute;
    const array = positions.array as Float32Array;
    for (let index = 0; index < safeCount; index += 1) {
      const offset = index * 3 + 1;
      array[offset] += Math.sin(t * 0.22 * drift[index] + index) * 0.00042;
    }
    positions.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
