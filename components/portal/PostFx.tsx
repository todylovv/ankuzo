"use client";

import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { useMemo } from "react";
import { Vector2 } from "three";

/**
 * The pass that separates "rendered" from "photographed".
 *
 * Everything before this was correct and inert: right materials, right light,
 * and an image that still looked computed. What was missing is what a lens and
 * a sensor add on the way to a picture — highlights that bleed, colour that
 * splits at the edges of the frame, and grain over all of it. No amount of
 * material tuning substitutes for it, which is why three rounds of adjusting
 * roughness never got there.
 *
 * Bloom does most of the work: a specular highlight on real chrome is brighter
 * than the medium can hold, so it spills into its surroundings. Without that
 * spill a highlight reads as a light-grey shape rather than as light.
 */
export function PostFx({ reducedMotion = false }: { reducedMotion?: boolean }) {
  // Aberration is a constant vector; rebuilding it each render would hand the
  // effect a new uniform every frame for no reason.
  const aberration = useMemo(() => new Vector2(0.0006, 0.0008), []);

  return (
    <EffectComposer
      // The scene is dark and the only bright things are specular highlights,
      // so there is nothing for multisampling to fix and a real cost to paying
      // for it on a field of tens of thousands of points.
      multisampling={0}
      enableNormalPass={false}
    >
      <Bloom
        // Threshold sits just under the brightest the metal reaches, so only
        // true highlights bloom. Lower and the whole glyph glows, which is the
        // usual way this effect goes wrong.
        luminanceThreshold={0.72}
        luminanceSmoothing={0.28}
        intensity={0.85}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      {/* Kept to the one prop the package types accept cleanly. The split is
          deliberately tiny — visible at the frame's edges, invisible on the
          type, which is where a heavier setting starts to look broken. */}
      <ChromaticAberration offset={aberration} />
      {/* Grain last, so it sits on top of the bloom rather than being blurred
          into it — film grain lives on the film, not in the scene. */}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={reducedMotion ? 0.16 : 0.24} />
      <Vignette eskil={false} offset={0.24} darkness={0.72} />
    </EffectComposer>
  );
}
