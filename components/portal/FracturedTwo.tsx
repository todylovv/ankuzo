"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { GOTHIC_TWO_CONTOUR, makeGothicTwoShape, useGothicTwoGeometry } from "./GothicTwo";
import { SCENE } from "./theme";

type Point = [number, number];
type Bounds = [number, number, number, number];

const PIECE_BOUNDS: Bounds[] = [
  [-4, 4, 2.35, 6],
  [-4, 0.15, 0.45, 2.35],
  [0.15, 4, 0.45, 2.35],
  [-4, 4, -1.35, 0.45],
  [-4, 4, -3, -1.35],
  [-4, 4, -6, -3],
];

const FRACTURE_MOTION = [
  { x: 0.62, y: 1.25, z: 0.35, rx: -0.08, ry: 0.2, rz: 0.06 },
  { x: 1.02, y: 0.3, z: 0.7, rx: 0.06, ry: 0.3, rz: 0.12 },
  { x: 0.48, y: -0.15, z: 0.28, rx: -0.04, ry: 0.16, rz: -0.04 },
  { x: 0.78, y: -0.65, z: 0.86, rx: 0.14, ry: 0.24, rz: -0.09 },
  { x: 1.08, y: -1.35, z: 0.26, rx: 0.2, ry: 0.28, rz: 0.11 },
  { x: 0.52, y: -2.35, z: -0.25, rx: 0.18, ry: 0.15, rz: -0.06 },
];

function smoothstep(start: number, end: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function clipPolygon(subject: Point[], bounds: Bounds) {
  const [minX, maxX, minY, maxY] = bounds;
  let output = subject;

  const clip = (
    points: Point[],
    inside: (point: Point) => boolean,
    intersect: (a: Point, b: Point) => Point,
  ) => {
    const next: Point[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const previous = points[(index + points.length - 1) % points.length];
      const currentInside = inside(current);
      const previousInside = inside(previous);
      if (currentInside) {
        if (!previousInside) next.push(intersect(previous, current));
        next.push(current);
      } else if (previousInside) {
        next.push(intersect(previous, current));
      }
    }
    return next;
  };

  const vertical = (x: number) => (a: Point, b: Point): Point => {
    const t = Math.abs(b[0] - a[0]) < 0.00001 ? 0 : (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + (b[1] - a[1]) * t];
  };
  const horizontal = (y: number) => (a: Point, b: Point): Point => {
    const t = Math.abs(b[1] - a[1]) < 0.00001 ? 0 : (y - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * t, y];
  };

  output = clip(output, ([x]) => x >= minX, vertical(minX));
  output = clip(output, ([x]) => x <= maxX, vertical(maxX));
  output = clip(output, ([, y]) => y >= minY, horizontal(minY));
  output = clip(output, ([, y]) => y <= maxY, horizontal(maxY));
  return output;
}

function createFragmentGeometry(contour: Point[]) {
  const geometry = new ExtrudeGeometry(makeGothicTwoShape(contour), {
    depth: 1.62,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.045,
  });
  geometry.scale(0.78, 0.78, 0.78);
  // Uses the same full-glyph origin as the approved pristine mesh so the
  // authored fragments assemble into precisely the same silhouette.
  geometry.translate(0.0429, -0.1755, -0.6318);
  geometry.computeVertexNormals();
  return geometry;
}

// Fragments are immutable, so they are built once per module and shared.
let fragmentGeometries: ExtrudeGeometry[] | null = null;

function useFragmentGeometries() {
  fragmentGeometries ??= PIECE_BOUNDS.map(
    (bounds) => createFragmentGeometry(clipPolygon(GOTHIC_TWO_CONTOUR, bounds)),
  );
  return fragmentGeometries;
}

const CRACK_PATHS: Array<Array<[number, number]>> = [
  [[-0.12, 3.35], [0.08, 3.08], [0.4, 2.72]],
  [[-1.7, 1.92], [-1.42, 1.55], [-1.08, 1.14]],
  [[0.42, 0.56], [0.17, 0.18], [-0.06, -0.43]],
  [[-0.2, -1.72], [0.08, -2.15], [0.34, -2.62]],
  [[0.06, -3.0], [0.32, -3.34], [0.73, -3.58]],
];

function useCrackGeometries(radius: number) {
  const geometries = useMemo(() => CRACK_PATHS.map((points) => {
    const curve = new CatmullRomCurve3(points.map(([x, y]) => new Vector3(x, y, 0.67)));
    return new TubeGeometry(curve, 16, radius, 5, false);
  }), [radius]);
  // Passed as a prop, so R3F will not dispose it for us.
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return geometries;
}

function CrackLayer({
  darkMaterial,
  lightMaterial,
}: {
  darkMaterial: MeshStandardMaterial;
  lightMaterial: MeshStandardMaterial;
}) {
  const dark = useCrackGeometries(0.026);
  const light = useCrackGeometries(0.008);
  return (
    <>
      {dark.map((geometry, index) => <mesh key={`dark-${index}`} geometry={geometry} material={darkMaterial} />)}
      {light.map((geometry, index) => <mesh key={`light-${index}`} geometry={geometry} material={lightMaterial} />)}
    </>
  );
}

export function PortalTwentyTwo({
  progress,
  masterProgress,
}: {
  progress: MutableRefObject<number>;
  masterProgress: MutableRefObject<number>;
}) {
  const pristineGeometry = useGothicTwoGeometry();
  const fragments = useFragmentGeometries();
  const pieceRefs = useRef<Array<Mesh | null>>([]);
  const { size } = useThree();
  const portrait = size.width / size.height < 0.78;
  const offset = portrait ? 1.68 : 2.2;
  const scale = portrait ? 0.72 : 0.84;

  // Same glyph, same room, so the same shading argument as ContinuousWorld: the
  // faces mirror one large constant panel and had to come down out of the flat
  // top of the tone curve, while the walls look into an empty room and had to
  // come up. Keeping the two components in step matters more than usual here —
  // the portal glyph and the artefact are the same object seen twice, and any
  // divergence reads as the metal changing on the way through.
  const pristineMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chrome,
    metalness: 0.96,
    roughness: 0.26,
    envMapIntensity: 0.78,
    clearcoat: 0.34,
    clearcoatRoughness: 0.4,
    transparent: true,
  }), []);
  const pristineSideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chromeSide,
    metalness: 0.92,
    roughness: 0.34,
    envMapIntensity: 1.45,
    clearcoat: 0.12,
    clearcoatRoughness: 0.3,
    transparent: true,
  }), []);
  // Fragments tumble, so their faces sweep through the whole environment rather
  // than staring at the one panel. They sit between the two settings above:
  // enough environment to flash as they turn, enough roughness not to strobe.
  const fragmentMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chromeSecondary,
    metalness: 0.94,
    roughness: 0.3,
    envMapIntensity: 1.05,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
    transparent: true,
  }), []);
  const rawMaterial = useMemo(() => new MeshStandardMaterial({
    color: SCENE.raw,
    metalness: 0.38,
    roughness: 0.88,
    transparent: true,
  }), []);
  const darkCrackMaterial = useMemo(() => new MeshStandardMaterial({
    color: SCENE.fracture,
    metalness: 0.1,
    roughness: 1,
    transparent: true,
    depthWrite: false,
  }), []);
  const lightCrackMaterial = useMemo(() => new MeshStandardMaterial({
    color: SCENE.crackLight,
    emissive: SCENE.crackLight,
    emissiveIntensity: 1.4,
    transparent: true,
    depthWrite: false,
  }), []);

  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => {
    pristineMaterial.dispose();
    pristineSideMaterial.dispose();
    fragmentMaterial.dispose();
    rawMaterial.dispose();
    darkCrackMaterial.dispose();
    lightCrackMaterial.dispose();
  }, [
    pristineMaterial,
    pristineSideMaterial,
    fragmentMaterial,
    rawMaterial,
    darkCrackMaterial,
    lightCrackMaterial,
  ]);

  useFrame(() => {
    const value = progress.current;
    // Only opacity and placement change per frame. Colours and shading numbers
    // used to be rewritten every tick, left over from the two-theme blend; with
    // one theme that is a second copy of the constants declared above, and the
    // copy is the one that would silently win.
    const portalPresence = 1 - smoothstep(0.225, 0.285, masterProgress.current);
    const pristineOpacity = (1 - smoothstep(0.54, 0.615, value)) * portalPresence;
    const fragmentOpacity = smoothstep(0.535, 0.595, value) * portalPresence;
    const crackOpacity = smoothstep(0.25, 0.45, value) * (1 - smoothstep(0.59, 0.69, value));
    pristineMaterial.opacity = pristineOpacity;
    pristineMaterial.visible = pristineOpacity > 0.01;
    pristineSideMaterial.opacity = pristineOpacity;
    pristineSideMaterial.visible = pristineOpacity > 0.01;
    fragmentMaterial.opacity = fragmentOpacity;
    rawMaterial.opacity = fragmentOpacity;
    darkCrackMaterial.opacity = crackOpacity * 0.92;
    lightCrackMaterial.opacity = crackOpacity * smoothstep(0.36, 0.5, value) * 0.7;

    pieceRefs.current.forEach((mesh, flatIndex) => {
      if (!mesh) return;
      const digitIndex = Math.floor(flatIndex / fragments.length);
      const pieceIndex = flatIndex % fragments.length;
      const sign = digitIndex === 0 ? -1 : 1;
      const motion = FRACTURE_MOTION[pieceIndex];
      const travel = smoothstep(0.575 + pieceIndex * 0.008, 0.9 + pieceIndex * 0.008, value);
      mesh.visible = fragmentOpacity > 0.01;
      mesh.position.set(sign * motion.x * travel, motion.y * travel, motion.z * travel);
      mesh.rotation.set(
        motion.rx * travel,
        sign * motion.ry * travel,
        sign * motion.rz * travel,
      );
    });
  });

  return (
    <group position={[0, -0.04, 0]}>
      {[-1, 1].map((side, digitIndex) => (
        <group
          key={side}
          position={[side * offset, side < 0 ? 0.02 : -0.02, 0]}
          rotation={[side < 0 ? 0.02 : -0.02, side < 0 ? 0.055 : -0.055, side < 0 ? -0.025 : 0.025]}
          scale={scale}
        >
          <mesh geometry={pristineGeometry} material={[pristineMaterial, pristineSideMaterial]} />
          <CrackLayer darkMaterial={darkCrackMaterial} lightMaterial={lightCrackMaterial} />
          {fragments.map((geometry, pieceIndex) => (
            <mesh
              key={pieceIndex}
              ref={(node) => { pieceRefs.current[digitIndex * fragments.length + pieceIndex] = node; }}
              geometry={geometry}
              material={[fragmentMaterial, rawMaterial]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
