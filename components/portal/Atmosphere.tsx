"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F
   drives Three.js imperatively; uniforms are written in place each frame. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, GLSL3, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { SCENE } from "./theme";

/**
 * The ground: vignette and film grain, and deliberately nothing else.
 *
 * An earlier version drifted fractal noise across the whole frame. With the
 * ribbons moving in front of it the result was two competing weather systems,
 * so the ground went still and the ribbons kept the motion. What stays is the
 * part that was doing real work.
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
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform float uGrain;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  // The ground is nearly flat on purpose. The ribbons are the thing that moves
  // here; a second drifting layer behind them turned the frame into weather.
  vec3 color = uBase;

  // A dark room has falloff, and it keeps the corners from competing with type
  // that lives near the edges.
  float vignette = smoothstep(1.4, 0.2, length(p));
  color *= 0.62 + vignette * 0.38;

  // Film grain. An absolutely clean dark field is the biggest tell that an
  // image came out of a renderer — nothing photographed is ever that clean —
  // and it also hides the banding any smooth dark gradient shows in 8-bit.
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
  color += grain * uGrain;

  fragColor = vec4(max(color, 0.0), 1.0);
}
`;

export function Atmosphere({ reducedMotion = false }: { reducedMotion?: boolean }) {
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
      uResolution: { value: new Vector2(1, 1) },
      uBase: { value: new Color(SCENE.background) },
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
    // Reduced motion keeps the grain but calms it: texture is what makes the
    // room a place, movement is what makes some people ill.
    material.uniforms.uGrain.value = reducedMotion ? 0.022 : 0.035;
  }, [material, reducedMotion]);

  useFrame((state) => {
    if (!reducedMotion) material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />
  );
}
