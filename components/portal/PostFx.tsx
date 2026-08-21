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
  // Down again: on the rendered frame the split had become visible as magenta
  // and green rims along the glyph, which reads as a defect rather than as a
  // lens. This is meant to be felt as an absence when removed, never seen.
  const aberration = useMemo(() => new Vector2(0.00008, 0.00011), []);

  return (
    <EffectComposer
      // The scene is dark and the only bright things are specular highlights,
      // so there is nothing for multisampling to fix and a real cost to paying
      // for it on a field of tens of thousands of points.
      multisampling={0}
      enableNormalPass={false}
    >
      <Bloom
        // The threshold has to sit ABOVE the metal's general brightness, not
        // just under its peak. Set too low the whole face qualifies as a
        // highlight and the glyph turns into a lamp — which is exactly what
        // happened at 0.62. Only the specular streaks should pass.
        luminanceThreshold={0.9}
        luminanceSmoothing={0.14}
        intensity={0.26}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      {/* Kept to the one prop the package types accept cleanly. The split is
          deliberately tiny — visible at the frame's edges, invisible on the
          type, which is where a heavier setting starts to look broken. */}
      <ChromaticAberration offset={aberration} />
      {/* Grain last, so it sits on top of the bloom rather than being blurred
          into it — film grain lives on the film, not in the scene. Kept very
          low: grain you can see as grain is dirt, and the dust field is
          already supplying texture in the same frequency band. */}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={reducedMotion ? 0.04 : 0.07} />
      <Vignette eskil={false} offset={0.24} darkness={0.72} />
    </EffectComposer>
  );
}
