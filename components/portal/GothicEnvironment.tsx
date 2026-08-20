"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F scene objects are updated per frame. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  Group,
  MeshStandardMaterial,
  Path,
  Shape,
  TubeGeometry,
  Vector3,
} from "three";
import { DARK_PALETTE, LIGHT_PALETTE, mixColor } from "./theme";

function createPointedRib(width: number, height: number, depth: number, radius: number) {
  const points = [
    new Vector3(-width, -height, depth),
    new Vector3(-width, height * 0.08, depth),
    new Vector3(-width * 0.68, height * 0.58, depth),
    new Vector3(-width * 0.18, height * 0.93, depth),
    new Vector3(0, height, depth),
    new Vector3(width * 0.18, height * 0.93, depth),
    new Vector3(width * 0.68, height * 0.58, depth),
    new Vector3(width, height * 0.08, depth),
    new Vector3(width, -height, depth),
  ];
  return new TubeGeometry(new CatmullRomCurve3(points, false, "centripetal", 0.3), 80, radius, 6, false);
}

function createPointedArchSlab(width: number, height: number, thickness: number) {
  const outer = new Shape();
  outer.moveTo(-width, -height);
  outer.lineTo(-width, height * 0.08);
  outer.lineTo(-width * 0.7, height * 0.58);
  outer.lineTo(-width * 0.18, height * 0.93);
  outer.lineTo(0, height);
  outer.lineTo(width * 0.18, height * 0.93);
  outer.lineTo(width * 0.7, height * 0.58);
  outer.lineTo(width, height * 0.08);
  outer.lineTo(width, -height);
  outer.closePath();

  const innerWidth = width - thickness;
  const innerHeight = height - thickness * 0.5;
  const opening = new Path();
  opening.moveTo(-innerWidth, -height + thickness * 0.25);
  opening.lineTo(innerWidth, -height + thickness * 0.25);
  opening.lineTo(innerWidth, innerHeight * 0.08);
  opening.lineTo(innerWidth * 0.7, innerHeight * 0.58);
  opening.lineTo(innerWidth * 0.18, innerHeight * 0.93);
  opening.lineTo(0, innerHeight);
  opening.lineTo(-innerWidth * 0.18, innerHeight * 0.93);
  opening.lineTo(-innerWidth * 0.7, innerHeight * 0.58);
  opening.lineTo(-innerWidth, innerHeight * 0.08);
  opening.closePath();
  outer.holes.push(opening);

  const geometry = new ExtrudeGeometry(outer, {
    depth: 0.28,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  geometry.translate(0, 0, -0.14);
  geometry.computeVertexNormals();
  return geometry;
}

type RibSpec = { geometry: BufferGeometry; opacity: number };
type SlabSpec = { geometry: BufferGeometry; z: number; opacity: number };

// The architecture never changes shape, so its geometry is built once per module
// and shared by every mount rather than rebuilt (and leaked) per instance.
let ribSpecs: RibSpec[] | null = null;
let slabSpecs: SlabSpec[] | null = null;
let columnGeometries: BufferGeometry[] | null = null;

function getRibs() {
  ribSpecs ??= [
    { geometry: createPointedRib(7.7, 8.4, -7.8, 0.085), opacity: 0.28 },
    { geometry: createPointedRib(6.0, 7.1, -4.6, 0.065), opacity: 0.24 },
    { geometry: createPointedRib(4.65, 6.15, -1.4, 0.045), opacity: 0.18 },
  ];
  return ribSpecs;
}

function getSlabs() {
  slabSpecs ??= [
    { geometry: createPointedArchSlab(7.85, 8.5, 0.48), z: -8.05, opacity: 0.12 },
    { geometry: createPointedArchSlab(6.1, 7.18, 0.38), z: -4.78, opacity: 0.085 },
  ];
  return slabSpecs;
}

function getColumnGeometries() {
  // Both sides share the same three column profiles.
  columnGeometries ??= [0, 1, 2].map((index) => new BoxGeometry(
    0.46 + index * 0.13,
    13.5 - index * 1.2,
    0.5 + index * 0.12,
  ));
  return columnGeometries;
}

// The architecture holds still. It used to ease toward the cursor, which made
// the whole set sway underneath a camera that was already moving.
export function GothicEnvironment({
  themeProgress,
}: {
  themeProgress: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const { size } = useThree();
  const portrait = size.width / size.height < 0.78;
  const ribs = getRibs();
  const slabs = getSlabs();
  const columns = getColumnGeometries();
  const ribMaterials = useMemo(() => ribs.map(({ opacity }) => new MeshStandardMaterial({
    color: LIGHT_PALETTE.architecture,
    metalness: 0.18,
    roughness: 0.72,
    transparent: true,
    opacity,
    depthWrite: false,
  })), [ribs]);
  const slabMaterials = useMemo(() => slabs.map(({ opacity }) => new MeshStandardMaterial({
    color: LIGHT_PALETTE.surface,
    metalness: 0.08,
    roughness: 0.82,
    transparent: true,
    opacity,
    depthWrite: false,
  })), [slabs]);
  const stoneMaterial = useMemo(() => new MeshStandardMaterial({
    color: LIGHT_PALETTE.architecture,
    metalness: 0.05,
    roughness: 0.88,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }), []);
  const working = useMemo(() => new Color(), []);

  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => ribMaterials.forEach((material) => material.dispose()), [ribMaterials]);
  useEffect(() => () => slabMaterials.forEach((material) => material.dispose()), [slabMaterials]);
  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);

  useFrame(() => {
    const t = themeProgress.current;
    ribMaterials.forEach((material, index) => {
      mixColor(material.color, LIGHT_PALETTE.architecture, DARK_PALETTE.architecture, t);
      material.opacity = ribs[index].opacity + t * 0.045;
    });
    slabMaterials.forEach((material, index) => {
      mixColor(material.color, LIGHT_PALETTE.surface, DARK_PALETTE.surface, t);
      material.opacity = slabs[index].opacity + t * 0.075;
    });
    mixColor(working, LIGHT_PALETTE.surface, DARK_PALETTE.surface, t);
    stoneMaterial.color.copy(working);
    stoneMaterial.opacity = 0.18 + t * 0.1;
  });

  const sideX = portrait ? 4.7 : 7.2;
  return (
    <group ref={group} scale={portrait ? 0.82 : 1}>
      {ribs.map((rib, index) => (
        <mesh key={`rib-${index}`} geometry={rib.geometry} material={ribMaterials[index]} />
      ))}
      {slabs.map((slab, index) => (
        <mesh key={`slab-${index}`} geometry={slab.geometry} material={slabMaterials[index]} position={[0, 0, slab.z]} />
      ))}
      {[-1, 1].flatMap((side) => [0, 1, 2].map((index) => (
        <mesh
          key={`${side}-${index}`}
          geometry={columns[index]}
          material={stoneMaterial}
          position={[side * (sideX + index * 1.22), -0.5 + index * 0.12, -2.2 - index * 2.4]}
          rotation={[0, side * (0.08 + index * 0.035), side * 0.015]}
        />
      )))}
    </group>
  );
}
