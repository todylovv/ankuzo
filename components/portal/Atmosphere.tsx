"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F
   drives Three.js imperatively; uniforms are written in place each frame. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Color, GLSL3, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { SCENE } from "./theme";

/**
 * The room itself, rendered as a full-screen backdrop behind everything.
 *
 * A flat clear colour makes a dark scene read as an empty buffer rather than
 * as a place. This gives the ground slow volume — domain-warped fractal noise,
 * which drifts like light through dust instead of pulsing like a gradient —
 * plus the film grain the art direction has been promising since the start.
 *
 * Grain matters more than it sounds: an absolutely clean dark field is the
 * single biggest tell that an image came out of a renderer, because nothing
 * photographed is ever that clean. It also hides the banding that any smooth
 * dark gradient produces in 8-bit colour.
 *
 * It draws at the far plane with depth testing off, so it costs one quad and
 * can never occlude anything in the scene.
 */

const vertexShader = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  // Straight to clip space at the far plane: full coverage whatever the camera
  // is doing, and no dependence on the scene's transform at all.
  gl_Position = vec4(position.xy * 2.0, 1.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uCold;
uniform vec3 uWarm;
uniform float uGrain;

// Value noise: cheap, and its softness is what we want here — gradient noise
// would give crisper cells than light through dust ever has.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    total += noise(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.5;
  }
  return total;
}

void main() {
  // Correct for aspect so the structure never stretches on wide screens.
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float t = uTime * 0.021;

  // Domain warp: noise sampled through noise. This is what separates drifting
  // volume from a moving gradient — the field folds over itself instead of
  // sliding, so it never repeats visibly.
  vec2 warp = vec2(
    fbm(p * 1.15 + vec2(0.0, t)),
    fbm(p * 1.15 + vec2(5.2, -t * 0.85))
  );
  float density = fbm(p * 1.6 + warp * 1.9 + vec2(t * 0.5, 0.0));

  // Push the midtones down so the field stays a ground rather than a subject.
  density = pow(clamp(density, 0.0, 1.0), 2.15);

  // A second, larger and slower body gives the depth two scales instead of one.
  float body = fbm(p * 0.55 - vec2(t * 0.35, t * 0.12));
  density = density * 0.75 + pow(clamp(body, 0.0, 1.0), 2.6) * 0.45;

  vec3 color = mix(uBase, uCold, density * 0.85);

  // One warm bloom, low and to the right, drifting on its own clock. It keeps
  // the room from reading as uniformly cold — the same reason the environment
  // carries a single warm sliver.
  float warmth = smoothstep(0.75, 0.0, length(p - vec2(0.62, -0.34)));
  color = mix(color, uWarm, warmth * density * 0.22);

  // The field lifts slightly as the journey goes on, so the last chapters feel
  // less like the first ones with different words on them.
  color *= 0.82 + uProgress * 0.3;

  // Vignette: a dark room has falloff, and it also keeps the corners from
  // competing with type that lives near the edges.
  float vignette = smoothstep(1.35, 0.25, length(p));
  color *= 0.45 + vignette * 0.55;

  // Film grain, animated per frame. Kept below the point where it reads as
  // texture — it should only be visible as an absence when removed.
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
  color += grain * uGrain;

  fragColor = vec4(max(color, 0.0), 1.0);
}
`;

export function Atmosphere({
  progress,
  reducedMotion = false,
}: {
  progress: MutableRefObject<number>;
  reducedMotion?: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const { size, viewport } = useThree();

  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const material = useMemo(() => new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uResolution: { value: new Vector2(1, 1) },
      uBase: { value: new Color(SCENE.background) },
      uCold: { value: new Color(SCENE.architecture) },
      uWarm: { value: new Color(SCENE.reflectionWarm) },
      uGrain: { value: 0.035 },
    },
  }), []);

  // Built by hand, so released by hand.
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useEffect(() => {
    material.uniforms.uResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
  }, [material, size.width, size.height, viewport.dpr]);

  useEffect(() => {
    // Reduced motion keeps the volume and the grain but stops the drift: the
    // texture is what makes the room a place, the movement is what makes some
    // people ill.
    material.uniforms.uGrain.value = reducedMotion ? 0.022 : 0.035;
  }, [material, reducedMotion]);

  useFrame((state) => {
    if (!reducedMotion) material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uProgress.value = progress.current;
  });

  return (
    <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />
  );
}
