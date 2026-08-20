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
 * The shape is baked once on the CPU — points scattered through a handful of
 * long curved streams — and every frame after that is a uniform update. All the
 * motion happens in the vertex shader, so the field costs one draw call and no
 * per-frame CPU work regardless of how many points it holds. That is what
 * makes it affordable to keep running behind a scene that is already carrying
 * a mirrored artefact.
 *
 * Three things decide whether this reads as ribbons or as a starfield, and all
 * three are geometry rather than colour:
 *
 * 1. Density along the stream. Points spread evenly over the frame read as
 *    stars; points packed along a path read as a sheet. The count is spent on
 *    length, not on area — many samples along the curve, few across it.
 * 2. A body, not a plane. A zero-thickness sheet seen from its own plane
 *    collapses into a one-pixel line across the frame, which is what the
 *    production screenshots were showing. Every ribbon is now an extruded
 *    volume: a wide axis, a shallower one, and a roll that twists between them
 *    along the curve, so no ribbon is ever axis-aligned with the eye.
 * 3. Placement against the camera path. The flight runs from z ≈ +13.5 to
 *    z ≈ -8.7 straight down the axis, so ribbons parked at z ≈ -9…-33 sat
 *    entirely ahead of it and left the middle of the frame empty for the whole
 *    portal. Half the ribbons now spiral around the flight axis and span the
 *    corridor itself, which is what fills the centre while the camera moves.
 */

const RIBBONS = 6;
/** The first few spiral around the camera's flight path; the rest cross the room. */
const AXIAL_RIBBONS = 3;
/** Samples down the length of a ribbon. This is where the density lives. */
const SAMPLES_ALONG = 780;
/** Hard ceiling so the archive-size multiplier can never push past ~39k points. */
const MAX_SAMPLES_ALONG = 1080;
/** Samples per step, scattered through the ribbon's cross-section. */
const SAMPLES_ACROSS = 6;

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildRibbons(density: number) {
  const random = seeded(220222);
  const along = Math.min(
    MAX_SAMPLES_ALONG,
    Math.max(320, Math.round(SAMPLES_ALONG * density)),
  );
  const total = RIBBONS * along * SAMPLES_ACROSS;

  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const shades = new Float32Array(total);

  const point = new Vector3();
  const tangent = new Vector3();
  const normal = new Vector3();
  const binormal = new Vector3();
  const across = new Vector3();
  const through = new Vector3();
  const refUp = new Vector3(0, 1, 0);
  const refFwd = new Vector3(0, 0, 1);
  let cursor = 0;

  for (let ribbon = 0; ribbon < RIBBONS; ribbon += 1) {
    const controls: Vector3[] = [];
    const sweep = ribbon % 2 === 0 ? 1 : -1;

    if (ribbon < AXIAL_RIBBONS) {
      // Streams that run the length of the corridor the camera flies down,
      // helixing around it. The radius is allowed to swing through zero, so
      // each one crosses the axis at least once: that crossing is what puts
      // dust in the middle of the frame during the portal instead of only at
      // its edges. Depth spans z +16 → -32, which starts behind the camera's
      // first position and ends well past its last, so the stream is entering
      // and leaving frame the whole way rather than being flown past.
      const phase = random() * Math.PI * 2;
      const turn = (1.2 + random() * 1.7) * sweep;
      const radiusBase = 2.4 + random() * 1.9;
      const radiusSwing = 1.7 + random() * 1.9;
      for (let knot = 0; knot < 8; knot += 1) {
        const p = knot / 7;
        const angle = phase + p * turn * Math.PI;
        const radius = radiusBase + Math.sin(p * Math.PI * 1.7 + phase) * radiusSwing;
        controls.push(new Vector3(
          Math.cos(angle) * radius,
          // Squashed vertically: the frame is wider than it is tall, so a
          // circular helix spends too much of its time out of shot above and
          // below.
          Math.sin(angle) * radius * 0.62 + (random() - 0.5) * 1.1,
          16 - p * 48,
        ));
      }
    } else {
      // Ribbons that cut across the room rather than along it. They start and
      // end off-frame so they read as passing through, and they now reach as
      // near as z ≈ 0 instead of stopping at -9 — the near end is what sweeps
      // across the shot mid-flight.
      const drop = random();
      for (let knot = 0; knot < 7; knot += 1) {
        const p = knot / 6;
        controls.push(new Vector3(
          (p - 0.5) * 42 * sweep + (random() - 0.5) * 7,
          (random() - 0.5) * 9 + Math.sin(p * Math.PI * 1.4 + ribbon) * 3.6,
          -1 - drop * 14 - p * 13 + Math.sin(p * Math.PI * 2 + ribbon) * 2.5,
        ));
      }
    }

    const curve = new CatmullRomCurve3(controls, false, "centripetal", 0.4);
    // Arc length per step, used to jitter samples along the tangent. Without it
    // the samples land in perfectly even rings and the ribbon reads as a stack
    // of hoops instead of a continuous stream.
    const segment = curve.getLength() / along;
    const halfWidth = 1.05 + random() * 1.35;
    // The ribbon is flattened, not flat. A third of the width is enough that
    // an edge-on view still shows a band of points rather than a hairline,
    // while keeping the broad-side view reading as a sheet.
    const halfDepth = halfWidth * (0.36 + random() * 0.26);
    const roll = random() * Math.PI * 2;
    // At least ~70° of roll over the length, in one direction or the other.
    // A symmetric random range around zero occasionally hands out a ribbon
    // with no twist at all, and an untwisted ribbon on a straight run is
    // exactly the case that can still present one flat face to the camera.
    const twist = (random() < 0.5 ? -1 : 1) * (1.2 + random() * 2.6);

    for (let step = 0; step < along; step += 1) {
      const t = step / (along - 1);
      curve.getPointAt(t, point);
      curve.getTangentAt(t, tangent);
      // Pick the reference axis the tangent is least parallel to, otherwise the
      // cross product degenerates and the frame flips where a curve runs
      // vertically.
      const ref = Math.abs(tangent.y) > 0.9 ? refFwd : refUp;
      normal.copy(ref).cross(tangent).normalize();
      binormal.copy(tangent).cross(normal).normalize();

      // Rolling the cross-section along the curve is the second half of the
      // edge-on fix: even a perfectly straight ribbon presents a different
      // face to the camera at every point along its length, so it can never
      // resolve into a single flat line.
      const angle = roll + t * twist;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      across.copy(normal).multiplyScalar(ca).addScaledVector(binormal, sa);
      through.copy(normal).multiplyScalar(-sa).addScaledVector(binormal, ca);

      const arc = Math.sin(t * Math.PI);
      // Width holds nearly to the ends — a sin taper pinches the ribbon into a
      // lens, which loses the parallel edges that make it read as a ribbon.
      const taper = Math.pow(arc, 0.35);
      // Brightness does the dissolving instead, and only in the last few
      // percent at each end.
      const fade = Math.min(1, arc * 3.2);

      for (let sample = 0; sample < SAMPLES_ACROSS; sample += 1) {
        // Sum of uniforms ≈ a bell curve. A flat spread gives a slab with hard
        // sides; a bell gives a dense core that falls off into a soft edge,
        // which is what makes the stream read as having a body.
        const side = (random() + random() + random() - 1.5) / 1.5;
        const depth = random() + random() - 1;
        const glide = (random() - 0.5) * segment * 1.6;

        const offAcross = side * halfWidth * taper;
        const offThrough = depth * halfDepth * taper;
        positions[cursor * 3] =
          point.x + tangent.x * glide + across.x * offAcross + through.x * offThrough;
        positions[cursor * 3 + 1] =
          point.y + tangent.y * glide + across.y * offAcross + through.y * offThrough;
        positions[cursor * 3 + 2] =
          point.z + tangent.z * glide + across.z * offAcross + through.z * offThrough;
        seeds[cursor] = random() * 6.283;
        shades[cursor] = (0.3 + random() * 0.7) * (1 - side * side * 0.45) * fade;
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
//
// The amplitudes are deliberately low relative to the ribbon's own width. Drift
// larger than the cross-section pulls the points out of the stream and hands
// back exactly the even scatter this field is trying not to be; the low spatial
// frequencies mean neighbours move together, so the ribbon sways as one body.
vec3 turbulence(vec3 p, float seed) {
  float t = uTime * 0.16;
  return vec3(
    sin(p.z * 0.16 + t + seed) * 0.30 + sin(p.y * 0.21 - t * 0.7) * 0.14,
    cos(p.x * 0.14 - t * 0.85 + seed) * 0.26 + sin(p.z * 0.19 + t * 0.5) * 0.12,
    sin(p.x * 0.11 + t * 0.6 + seed) * 0.20
  );
}

void main() {
  vec3 displaced = position + turbulence(position, aSeed) * uScale;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Named viewDepth rather than depth/near/far: those shadow names around
  // gl_DepthRange that some drivers treat as reserved.
  float viewDepth = max(-mvPosition.z, 0.6);
  // Attenuate with distance, but hold a one-pixel floor. Sub-pixel points are
  // what make a far ribbon scintillate like a starfield; keeping them at a
  // pixel lets the sheet stay legible and lets brightness carry the distance.
  gl_PointSize = clamp(uSize * (24.0 / viewDepth), 1.0, 6.0);

  // The camera flies straight through these streams, so points arriving at the
  // near plane have to fade out rather than expand into a white wall.
  float nearFade = smoothstep(0.7, 4.5, viewDepth);
  float farFade = 1.0 - smoothstep(30.0, 52.0, viewDepth);
  vShade = aShade * nearFade * farFade;
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
  float mask = smoothstep(0.5, 0.14, length(d));
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
        // Smaller than before, because there are far more of them. Density
        // now comes from the number of points in the stream, not from each
        // one covering more of the screen.
        uSize: { value: 1.7 },
        uOpacity: { value: 0 },
        uColor: { value: new Color(SCENE.chromeHighlight) },
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

    // Up to full strength before the flight is properly under way. The field
    // used to hold back through the portal to leave the frame to the glyph,
    // but the glyph occupies a narrow band down the middle of a wide shot and
    // the result was a black surround; the streams are what give that flight
    // somewhere to happen.
    const entry = Math.min(1, Math.max(0, (value - 0.005) / 0.085));
    const quiet = Math.min(1, Math.max(0, (value - 0.62) / 0.12))
      * (1 - Math.min(1, Math.max(0, (value - 0.86) / 0.08)));
    // Additive blending over a much denser field: the per-point opacity has to
    // come down roughly in proportion, or the overlap in a stream's core
    // clips to white.
    material.uniforms.uOpacity.value = 0.3 + entry * 0.2 + quiet * 0.14;
    material.uniforms.uScale.value = reducedMotion ? 0.35 : 1;

    const node = points.current;
    if (!node) return;
    // The whole field turns very slowly, which is what keeps a static bake from
    // ever reading as a photograph of dust. The amplitudes are smaller than
    // they were because the field is now three times longer — the same angle
    // swings its far end much further.
    const t = state.clock.elapsedTime;
    node.rotation.z = Math.sin(t * 0.017) * 0.05;
    node.rotation.y = Math.sin(t * 0.011) * 0.035;
    node.position.z = Math.sin(t * 0.02) * 1;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
