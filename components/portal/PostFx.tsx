"use client";

import { Bloom, ChromaticAberration, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize, ToneMappingMode } from "postprocessing";
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
      {/* Contact darkening, and it is not decoration.
          A polished surface gets its form from what it reflects, so it can
          survive without this. A matte one cannot: diffuse shading alone gives
          every part of the glyph facing the same way the same value, so the
          counters — the enclosed holes in each digit — come out as flat black
          cut-outs and the point where the two digits pass each other reads as
          one silhouette rather than as two objects at different depths. AO is
          what puts a seam back between them, by darkening the crevices light
          would struggle to reach.

          Placed before Bloom so the darkening happens in linear light, on the
          scene, rather than being applied over a bloomed image where it would
          fight the very highlights it is supposed to leave alone. */}
      {/* Radius kept short deliberately. At 1.4 the occlusion reached past the
          glyph onto the dust field behind it and drew a dark aura around the
          silhouette — which reads as a drop shadow pasted under the object,
          the one thing that instantly makes a 3D scene look composited. This
          radius stays inside the geometry, where the crevices actually are. */}
      <N8AO aoRadius={0.75} intensity={2.1} distanceFalloff={0.5} quality="medium" halfRes />
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
      {/* The tone curve, and it has to live HERE.
          Mounting a composer hands it the output, and it runs the scene
          through with the renderer's own tone mapping switched off — so the
          `toneMapping` and `toneMappingExposure` set on the Canvas and in
          SceneLighting have been inert for as long as this file has existed.
          The scene was reaching the screen with no curve on it at all, which
          is why the highlights ended in a hard edge: nothing was rolling them
          off, they simply ran out of range. Measured on the ending frame,
          15.3% of the metal sat at 250+ with no gradient left in it.

          Proof it was inert, for whoever doubts it later: switching the
          renderer from ACES to AgX and lifting its exposure from 0.94 to 1.38
          moved the median luminance by 0.1 and the clipped fraction by 0.01
          points. Both changes were doing nothing.

          AgX rather than ACES now that the choice is real. Its shoulder is far
          longer and it desaturates into it instead of clamping to white, which
          is what a mirror needs — nearly everything interesting in this scene
          happens in the top of the range. It sits directly after Bloom because
          bloom belongs in linear light, and before the grain and vignette,
          which are darkroom steps and belong on the finished image. */}
      <ToneMapping mode={ToneMappingMode.AGX} />
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
