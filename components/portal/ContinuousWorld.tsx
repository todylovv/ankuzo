"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Group, MeshPhysicalMaterial } from "three";
import { useGothicTwoGeometry } from "./GothicTwo";
import { SCENE } from "./theme";

/**
 * Everything after the portal is carried by the artefact and by type — there is
 * no borrowed imagery in the scene at all.
 *
 * The previous version flew four game covers along four hand-tuned tracks. It
 * could not be rescued by tuning: cover art is drawn in other people's palettes
 * (an orange Counter-Strike beside an acid-green Apex) and destroys the site's
 * colour discipline the moment it enters frame. The numbers behind those games
 * are far stronger material — five thousand hours reads as a fact, a cover
 * reads as someone else's poster.
 */

/** Where the artefact fades in, and where the ending begins. The chapter
 *  boundaries themselves now live in ARTEFACT_PATH, one anchor each. */
const STEAM_START = 0.225;
const FINAL_START = 0.86;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function span(value: number, from: number, to: number) {
  return clamp01((value - from) / (to - from));
}

function ease(value: number) {
  return value * value * (3 - 2 * value);
}

/**
 * Where the artefact sits at each hand-off. Anchors rather than a formula,
 * because this is a piece of choreography and choreography is authored: the
 * object has to be on the opposite side from whichever rail the type is using.
 *
 * The anchors are sized against the actual frame, not judged by eye. After the
 * flight the camera sits at z ≈ -8.7 with a 35° vertical fov, so a plane at
 * z = -15.7 measures 4.4 units tall and, on a 3:2 laptop, only 6.6 wide — and
 * the pair of glyphs is 6.7 x 7.2 units before scaling. The previous anchors
 * were authored for a wider frame than the site ever gets, which is why every
 * middle chapter clipped the artefact at roughly the halfway line: an amount
 * that reads as an accident rather than as a crop. Each x below keeps the whole
 * silhouette inside the narrowest desktop frame with margin to spare.
 */
const ARTEFACT_PATH = [
  { p: 0.19, x: 2, y: 0.15, z: -16.8, ry: -0.42 },
  { p: 0.34, x: 1.62, y: 0.1, z: -15.9, ry: -0.3 },
  { p: 0.45, x: 1.55, y: 0.05, z: -15.7, ry: -0.24 },
  // PLAYSTATION mirrors: type moves right, so the artefact crosses to the left.
  { p: 0.58, x: -1.62, y: 0.02, z: -15.9, ry: 0.28 },
  { p: 0.66, x: -1.56, y: 0, z: -16.1, ry: 0.34 },
  // PRESENCE: back to the right and further away — the quiet chapter.
  { p: 0.78, x: 1.55, y: -0.22, z: -17.6, ry: -0.3 },
  { p: 0.86, x: 1.48, y: -0.26, z: -17.9, ry: -0.26 },
  // The ending brings it home and closer, but not centred: ANKUZO holds the
  // left rail there, so the artefact stops clear of the left third of the frame
  // instead of landing on top of the wordmark.
  { p: 1, x: 0.55, y: 0, z: -15.6, ry: 0 },
] as const;

export function ContinuousWorld({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  // Chrome cannot be one material here. The flat faces and the extruded walls
  // look into opposite halves of the room, so a single set of numbers can only
  // ever be right for one of them.
  //
  // The faces point straight down the barrel of the camera, so they mirror the
  // large panel standing behind it — and an environment map is sampled by
  // direction alone, which means a flat face gets the *same* sample at every
  // pixel. At envMapIntensity 2.35 that constant sample landed above the
  // shoulder of the ACES curve, where a 50% change in incoming light moves the
  // output by two or three percent: the face was not just bright, it was
  // incapable of shading. That is the flat white silhouette, and no texture is
  // needed to fix it — the environment simply has to sit low enough that the
  // direct lights still have somewhere to go. Roughness then does the modelling
  // work: at 0.115 the key light's lobe is narrow enough to clip into a single
  // blown spot, and widening it turns that spot into a sweep across the face.
  // A broad, weak clearcoat adds a second lobe offset from the first, so the
  // sweep has a soft edge rather than a hard boundary.
  const faceMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chrome,
    metalness: 0.96, roughness: 0.13, envMapIntensity: 1.35,
    clearcoat: 0.3, clearcoatRoughness: 0.36,
    // Brushed rather than mirror-smooth. Anisotropy stretches every reflection
    // along one axis, so the slats behind the camera arrive as long vertical
    // draws down the face instead of as a single flat wash — it is the same
    // trick that makes a real brushed-steel panel read as metal in a photo.
    anisotropy: 0.22, anisotropyRotation: Math.PI / 2,
    // A trace of thin-film. Chrome that is purely neutral looks computed; a
    // faint cold shift at grazing angles is what real plating does, and it
    // lands inside the palette's own blue rather than fighting it.
    iridescence: 0.2, iridescenceIOR: 1.5, iridescenceThicknessRange: [140, 420] as [number, number],
    transparent: true, opacity: 0,
  }), []);
  // The walls face sideways into a room that is nearly empty, so the same
  // damping would sink them into the background and take the glyph's edge with
  // them. They get the opposite treatment — more environment, not less, spread
  // wide enough to read as a rim rather than as a glint. The gap between this
  // and the faces above is what gives the extrusion its depth.
  const sideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chromeSide, metalness: 0.92, roughness: 0.32, envMapIntensity: 1.5,
    clearcoat: 0.12, clearcoatRoughness: 0.3,
    anisotropy: 0.3, anisotropyRotation: 0,
    transparent: true, opacity: 0,
  }), []);
  const geometry = useGothicTwoGeometry();
  const { size } = useThree();
  const portrait = size.width / size.height < 0.78;

  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => {
    faceMaterial.dispose();
    sideMaterial.dispose();
  }, [faceMaterial, sideMaterial]);

  useFrame(() => {
    const value = progress.current;

    // Only opacity changes per frame. The colour and the shading numbers used
    // to be rewritten here every tick, left over from the two-theme blend; with
    // one theme that is not just wasted work, it is a second copy of the same
    // constants waiting to disagree with the ones above.

    // The artefact appears once the portal has been crossed and never leaves.
    const arrival = ease(span(value, STEAM_START - 0.03, STEAM_START + 0.05));
    faceMaterial.opacity = arrival;
    sideMaterial.opacity = arrival;

    if (!group.current) return;
    group.current.visible = arrival > 0.005;

    // The artefact crosses the frame instead of sitting on one side. It stays
    // opposite the type: right while STEAM holds the left rail, left once
    // PLAYSTATION mirrors to the right, right again for PRESENCE, and just off
    // centre for the ending, where ANKUZO takes the left rail back. The swap is
    // the reason the chapters read as a sequence rather than as three versions
    // of one screen.
    const path = ARTEFACT_PATH;
    let index = 1;
    while (index < path.length - 1 && value > path[index].p) index += 1;
    const from = path[index - 1];
    const to = path[index];
    const t = ease(span(value, from.p, to.p));

    // A portrait frame is less than half as wide in world units as a landscape
    // one, so the authored lateral swing has to shrink hard and the whole path
    // has to stand further back — distance is the only way to buy width without
    // rewriting the choreography for a second aspect ratio.
    const sideways = portrait ? 0.36 : 1;
    const setback = portrait ? 1.7 : 0;
    group.current.position.set(
      (from.x + (to.x - from.x) * t) * sideways,
      from.y + (to.y - from.y) * t,
      from.z + (to.z - from.z) * t - setback,
    );
    // Always angled back toward the reader's side of the frame.
    group.current.rotation.y = from.ry + (to.ry - from.ry) * t;
    group.current.rotation.x = 0.03 * Math.sin((value - STEAM_START) * 2.2);

    // Largest at the ending, but sized off the frame rather than off ambition.
    // The pair measures 6.7 x 7.2 units at scale 1; the ending's plane is 4.4
    // tall, so 0.41 fills about two thirds of the height and still clears the
    // top and bottom edges. The old 0.52 at z = -13.4 was 3.7 units tall in a
    // 3.0-unit frame — the artefact was not large, it was simply outside.
    const scale = (portrait ? 0.3 : 0.36)
      + (portrait ? 0.12 : 0.05) * ease(span(value, FINAL_START, 1));
    group.current.scale.setScalar(scale);
  });

  // The pair had grown into each other: the left glyph's tail ran under the
  // right one's stem, which reads as a rendering fault rather than as a
  // ligature. Widened until the silhouettes clear each other outright.
  const offset = portrait ? 1.22 : 1.66;

  return (
    <group ref={group} visible={false}>
      {/* The two digits are toed in a few degrees rather than left coplanar.
          Coplanar faces sample the environment in exactly the same direction
          and therefore come out at exactly the same value, which is what made
          the pair read as one flat cut-out; a slight opposing yaw gives each
          glyph its own tone and the pair reads as two objects in a room. */}
      <mesh geometry={geometry} material={[faceMaterial, sideMaterial]}
        position={[-offset, 0, 0]} rotation={[0.018, 0.075, -0.02]} />
      <mesh geometry={geometry} material={[faceMaterial, sideMaterial]}
        position={[offset, 0, 0]} rotation={[-0.018, -0.075, 0.02]} />
    </group>
  );
}
