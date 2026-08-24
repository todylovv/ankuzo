"use client";

import { ExtrudeGeometry, Shape } from "three";

export const GOTHIC_TWO_CONTOUR: Array<[number, number]> = [
  [-0.842, 1.44], [-1.186, 1.567], [-1.386, 1.223], [-2.11, 0.824],
  [-2.128, 0.371], [-2.49, 1.005], [-2.182, 1.766], [-2.4, 2.961],
  [-1.096, 3.595], [0.009, 4.7], [0.734, 3.631], [1.95, 3.06],
  [1.84, 2.73], [1.76, 0.38], [1.55, -0.22], [0.009, -1.603],
  [-0.22, -1.55], [-0.38, -1.92], [-0.5, -2.94], [1.2, -2.83],
  [2.16, -2.04], [2.34, -2.2], [2.18, -3.6], [2.38, -4.0],
  [1.6, -3.82], [0.86, -4.2], [0.58, -3.93], [-1.05, -3.75],
  [-2.0, -4.0], [-2.35, -4.25], [-2.2, -3.2],
  [0.462, 0.589], [0.62, 2.31], [-0.48, 3.324], [-1.02, 2.82],
  [-1.24, 2.27], [-1.08, 1.73],
];

export function makeGothicTwoShape(contour = GOTHIC_TWO_CONTOUR) {
  const shape = new Shape();

  // The silhouette is traced from the supplied blackletter example, then
  // simplified only enough to produce clean bevel topology.
  shape.moveTo(...contour[0]);
  contour.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  return shape;
}

/**
 * Bow the flat caps outward into a very shallow dome.
 *
 * This is the difference between metal and paper. An environment map is
 * sampled by direction alone, so a perfectly planar face — one constant
 * normal — samples one constant direction and returns one constant colour, no
 * matter how the light is arranged. It physically cannot gradient. Curving the
 * cap by a fraction of a unit makes the normal sweep across the face, and with
 * it the reflection, which is what produces the continuous run of light that
 * reads as polished metal.
 *
 * The bow is small enough that the silhouette is unchanged; it exists only to
 * give the reflection somewhere to travel.
 */
function bowCaps(geometry: ExtrudeGeometry, depth: number, amount: number) {
  const position = geometry.attributes.position;
  const array = position.array as Float32Array;
  const front = depth;
  // Per-axis extents, because the two axes are weighted differently below and
  // a single radius cannot express that.
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < array.length; i += 3) {
    const x = Math.abs(array[i]);
    const y = Math.abs(array[i + 1]);
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  for (let i = 0; i < array.length; i += 3) {
    const z = array[i + 2];
    // Only the two caps; the bevel and the walls keep their shape so the
    // outline and the edge highlight stay exactly as authored.
    const onFront = Math.abs(z - front) < 1e-3;
    const onBack = Math.abs(z) < 1e-3;
    if (!onFront && !onBack) continue;
    // A cylinder lying on its side, not a dome.
    //
    // A dome curves equally in every direction, so its normals fan out from
    // the centre and it reflects the room as a blob in the middle of the face.
    // Weighting the curvature onto the vertical axis instead makes the normal
    // sweep through a wide arc down the height while barely turning across the
    // width, so the surface reads the room's vertical structure — sky, horizon,
    // ground — as one continuous band running the length of the glyph. That
    // band is what the eye uses to identify chrome, and it is what the horizon
    // light in the rig exists to supply.
    //
    // The weighting has to be a PRODUCT of two full-range profiles, one per
    // axis, and not a squashed radius. Compressing x inside a hypot was the
    // obvious thing to try and it is wrong: shrinking one term shrinks the
    // radius everywhere, the cosine no longer traverses its full range, and
    // the cap comes out nearly flat — which is a constant normal, a constant
    // environment sample, and the matte grey this whole approach exists to
    // avoid. Measured on the rendered frame it collapsed straight back to it.
    //
    // As a product, each axis still reaches zero at its own rim, so the cap
    // meets the bevel tangentially all the way round with no crease. The
    // fractional exponent is what does the weighting: cos(x)^0.35 is still
    // 0.89 at the halfway point, so the horizontal profile stays out of the
    // way across the body of the face and only bends near the outline.
    const nx = Math.min(1, Math.abs(array[i]) / (maxX || 1));
    const ny = Math.min(1, Math.abs(array[i + 1]) / (maxY || 1));
    const bow = amount
      * Math.pow(Math.cos(nx * Math.PI * 0.5), 0.35)
      * Math.cos(ny * Math.PI * 0.5);
    array[i + 2] = onFront ? z + bow : z - bow;
  }
  position.needsUpdate = true;
}

function createGothicTwoGeometry() {
  const depth = 1.62;
  const geometry = new ExtrudeGeometry(makeGothicTwoShape(), {
    depth,
    // No curveSegments here. The contour is 37 hand-placed points joined with
    // straight segments — there is not a single curve in the shape for that
    // option to subdivide, so the 48 it used to carry cost tessellation on the
    // bevel and bought nothing. Blackletter is built from straight strokes;
    // the roundness in this glyph comes from the bevel below, not the outline.
    // The caps have to be subdivided or there is nothing to bow: a two-triangle
    // face stays flat however far its corners move.
    steps: 6,
    bevelEnabled: true,
    // A wider, rounder bevel carries a continuous band of light around the
    // silhouette. The previous one was small enough that the polygons in it
    // read as steps rather than as a highlight.
    bevelSegments: 14,
    bevelSize: 0.2,
    bevelThickness: 0.22,
  });
  // Deep enough that the normal actually sweeps. At 0.16 the face turned by
  // roughly five degrees corner to corner, which is far less than the angular
  // width of a single light in the room — so the whole cap kept landing inside
  // one feature and came out uniform, first grey and then dark. This is still
  // shallow enough to leave the silhouette alone.
  bowCaps(geometry, depth, 0.34);
  geometry.scale(0.78, 0.78, 0.78);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

let gothicTwoGeometry: ExtrudeGeometry | null = null;

/**
 * The pristine glyph is immutable and shared across every consumer, so it is
 * built once per module and never disposed — a per-instance useMemo would
 * rebuild this heavy extrusion for each mounted component.
 */
export function useGothicTwoGeometry() {
  gothicTwoGeometry ??= createGothicTwoGeometry();
  return gothicTwoGeometry;
}
