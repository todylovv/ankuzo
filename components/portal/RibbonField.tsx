"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F
   drives Three.js imperatively: uniforms and object transforms are written in
   place each frame, which is the documented way to animate a scene. */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  GLSL3,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { SCENE } from "./theme";

/**
 * Ribbons of dust drifting through the room.
 *
 * The shape is baked once on the CPU — points scattered across a handful of
 * long curved sheets — and every frame after that is a uniform update. All the
 * motion happens in the vertex shader, so the field costs one draw call and no
 * per-frame CPU work regardless of how many points it holds. That is what
 * makes it affordable to keep running behind a scene that is already carrying
 * a mirrored artefact.
 *
 * It is deliberately thinner than the reference that inspired it: this page has
 * a subject in every frame, and a field dense enough to become the subject
 * itself would be competing with the thing it is supposed to sit behind.
 */

const RIBBONS = 5;
const SAMPLES_ALONG = 220;
const SAMPLES_ACROSS = 13;

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildRibbons(density: number) {
  const random = seeded(220222);
  const along = Math.max(90, Math.round(SAMPLES_ALONG * density));
  const total = RIBBONS * along * SAMPLES_ACROSS;

  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const shades = new Float32Array(total);

  const normal = new Vector3();
  const binormal = new Vector3();
  const point = new Vector3();
  const tangent = new Vector3();
  const up = new Vector3(0, 1, 0);
  let cursor = 0;

  for (let ribbon = 0; ribbon < RIBBONS; ribbon += 1) {
    // Long, lazy curves that cross the whole room. They start off-frame and
    // end off-frame, so the ribbons read as passing through rather than as
    // objects placed in the shot.
    const controls: Vector3[] = [];
    const sweep = random() > 0.5 ? 1 : -1;
    for (let knot = 0; knot < 6; knot += 1) {
      const progress = knot / 5;
      controls.push(new Vector3(
        (progress - 0.5) * 46 * sweep + (random() - 0.5) * 10,
        (random() - 0.5) * 13 + Math.sin(progress * Math.PI * 1.4 + ribbon) * 4,
        -16 - random() * 26 - progress * 6,
      ));
    }
    const curve = new CatmullRomCurve3(controls, false, "centripetal", 0.4);
    const width = 1.8 + random() * 2.6;

    for (let step = 0; step < along; step += 1) {
      const t = step / (along - 1);
      curve.getPointAt(t, point);
      curve.getTangentAt(t, tangent);
      normal.copy(up).cross(tangent).normalize();
      binormal.copy(tangent).cross(normal).normalize();

      // Ribbons taper at both ends so they dissolve instead of being cut off.
      const taper = Math.sin(t * Math.PI);

      for (let across = 0; across < SAMPLES_ACROSS; across += 1) {
        const side = (across / (SAMPLES_ACROSS - 1) - 0.5) * 2;
        // Density falls off toward the edges of the sheet: an even spread
        // reads as a wall, a weighted one reads as something with a body.
        const falloff = 1 - side * side * 0.55;
        const spread = side * width * taper + (random() - 0.5) * 0.5;
        const lift = (random() - 0.5) * 0.85 * taper;

        positions[cursor * 3] = point.x + normal.x * spread + binormal.x * lift;
        positions[cursor * 3 + 1] = point.y + normal.y * spread + binormal.y * lift;
        positions[cursor * 3 + 2] = point.z + normal.z * spread + binormal.z * lift;
        seeds[cursor] = random() * 6.283;
        shades[cursor] = (0.28 + random() * 0.72) * falloff * taper;
        cursor += 1;
      }
    }
  }

  return { positions, seeds, shades, count: cursor };
}

const vertexShader = /* glsl */ `
in float aSeed;
in float aShade;
out float vShade;

uniform float uTime;
uniform float uScale;
uniform float uSize;

// Cheap trig turbulence rather than real noise: at this scale and this speed
// the difference is invisible, and it keeps the shader small enough that the
// whole field stays free.
vec3 turbulence(vec3 p, float seed) {
  float t = uTime * 0.16;
  return vec3(
    sin(p.z * 0.16 + t + seed) * 0.72 + sin(p.y * 0.21 - t * 0.7) * 0.34,
    cos(p.x * 0.14 - t * 0.85 + seed) * 0.62 + sin(p.z * 0.19 + t * 0.5) * 0.28,
    sin(p.x * 0.11 + t * 0.6 + seed) * 0.45
  );
}

void main() {
  vec3 displaced = position + turbulence(position, aSeed) * uScale;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  // Attenuate with distance so the far end of a ribbon falls into the room.
  gl_PointSize = uSize * (14.0 / -mvPosition.z);
  vShade = aShade;
}
`;

const fragmentShader = /* glsl */ `
precision mediump float;

in float vShade;
out vec4 fragColor;

uniform vec3 uColor;
uniform float uOpacity;

void main() {
  // Round, soft-edged points. Square dust looks like dead pixels.
  vec2 d = gl_PointCoord - 0.5;
  float mask = smoothstep(0.5, 0.12, length(d));
  if (mask <= 0.001) discard;
  fragColor = vec4(uColor * vShade, mask * vShade * uOpacity);
}
`;

export function RibbonField({
  progress,
  density = 1,
  reducedMotion = false,
}: {
  progress: MutableRefObject<number>;
  /** Scales the point count — the archive's size, gently applied. */
  density?: number;
  reducedMotion?: boolean;
}) {
  const points = useRef<Points>(null);

  const { geometry, material } = useMemo(() => {
    const field = buildRibbons(density);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(field.positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(field.seeds, 1));
    geo.setAttribute("aShade", new BufferAttribute(field.shades, 1));
    geo.setDrawRange(0, field.count);

    const mat = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uSize: { value: 1.55 },
        uOpacity: { value: 0 },
        uColor: { value: new Color(SCENE.chrome) },
      },
    });
    return { geometry: geo, material: mat };
  }, [density]);

  // Built by hand, released by hand.
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    const value = progress.current;
    if (!reducedMotion) material.uniforms.uTime.value = state.clock.elapsedTime;

    // Present from the approach onward. During the portal it stays faint so the
    // flight through the glyph keeps the frame to itself.
    const entry = Math.min(1, Math.max(0, (value - 0.02) / 0.16));
    const quiet = Math.min(1, Math.max(0, (value - 0.62) / 0.12))
      * (1 - Math.min(1, Math.max(0, (value - 0.86) / 0.08)));
    material.uniforms.uOpacity.value = 0.12 + entry * 0.5 + quiet * 0.3;
    material.uniforms.uScale.value = reducedMotion ? 0.35 : 1;

    const node = points.current;
    if (!node) return;
    // The whole field turns very slowly, which is what keeps a static bake from
    // ever reading as a photograph of dust.
    const t = state.clock.elapsedTime;
    node.rotation.z = Math.sin(t * 0.017) * 0.09;
    node.rotation.y = Math.sin(t * 0.011) * 0.06;
    node.position.z = Math.sin(t * 0.02) * 1.4;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
