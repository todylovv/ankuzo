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

function createGothicTwoGeometry() {
  const geometry = new ExtrudeGeometry(makeGothicTwoShape(), {
    depth: 1.62,
    curveSegments: 36,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 8,
    bevelSize: 0.12,
    bevelThickness: 0.16,
  });
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
