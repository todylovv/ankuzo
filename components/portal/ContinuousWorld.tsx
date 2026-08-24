"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Group, MeshPhysicalMaterial, PerspectiveCamera } from "three";
import { CHAPTER_BOUNDS, transposeProgress } from "./progress";
import type { ChapterBound } from "./progress";
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

/**
 * The artefact's finish, as one decision in one place.
 *
 * These are not two sets of numbers to taste between — they are two different
 * strategies for making a shape read as solid, and each one collapses if given
 * the other's supporting cast.
 *
 * POLISHED gets its form from the room. A mirror has no shading of its own, so
 * every gradient on it is something reflected; the rig's twelve slats and the
 * horizon band exist entirely to give it that something. Sharp, expensive,
 * and completely dependent on the environment being interesting.
 *
 * MATTE gets its form from occlusion and from the direct lights. Roughness
 * this high blurs the environment into a single soft gradient, which means the
 * slats stop mattering almost completely — and that is exactly the condition
 * that produced the flat grey this scene fought for weeks. It only works with
 * the N8AO pass carving the counters and the seam between the two digits.
 * Turn AO off and this finish dies immediately.
 *
 * Metalness stays high in both. Dropping it is what turns matte metal into
 * grey plastic: a blasted aluminium panel is still a conductor, it just
 * scatters. The difference between the two rows below is roughness and what
 * the surface is allowed to do with a specular lobe — the polished one carries
 * a brushed anisotropic stretch, a clearcoat and a trace of thin-film, none of
 * which survive being scattered and all of which look like noise on a matte
 * surface.
 */
type Finish = {
  face: { roughness: number; envMapIntensity: number; metalness: number };
  side: { roughness: number; envMapIntensity: number; metalness: number };
  /** Polish-only lobe tricks. Meaningless once the surface scatters. */
  specular: boolean;
};

const FINISHES: Record<"polished" | "matte" | "satin", Finish> = {
  polished: {
    face: { metalness: 0.96, roughness: 0.13, envMapIntensity: 1.35 },
    side: { metalness: 0.92, roughness: 0.32, envMapIntensity: 1.5 },
    specular: true,
  },
  matte: {
    // Blasted graphite rather than chalk. Roughness 0.58 is past the point
    // where the slats resolve as separate reflections but well short of fully
    // diffuse, so the horizon still arrives as one broad sweep down the glyph
    // instead of vanishing. The environment intensity is lifted because a
    // blurred sample is a dimmer sample — this is compensation for the blur,
    // not extra light.
    face: { metalness: 0.88, roughness: 0.58, envMapIntensity: 1.15 },
    // The walls go rougher still. On the polished finish they were lifted to
    // keep the extrusion's edge from sinking into the background; here that
    // job belongs to AO, and matching the faces too closely would flatten the
    // glyph back into a single silhouette.
    side: { metalness: 0.85, roughness: 0.72, envMapIntensity: 1.4 },
    specular: false,
  },
  // The middle road, and on this glyph probably the right one. Roughness 0.34
  // is past the point where the room resolves as a sharp picture — no slat
  // arrives with a hard edge — but nowhere near where it stops arriving at all.
  // The horizon still sweeps the length of the face, just softly, so the large
  // flat caps keep something to do. That is the whole problem with full matte
  // here: the glyph is mostly broad flat planes, and a scattered surface gives
  // a broad flat plane one value and nothing else.
  //
  // The lobe tricks stay on, because at this roughness they still read. It is
  // brushed titanium rather than either a mirror or a chalk cast.
  satin: {
    face: { metalness: 0.94, roughness: 0.34, envMapIntensity: 1.55 },
    side: { metalness: 0.9, roughness: 0.5, envMapIntensity: 1.7 },
    specular: true,
  },
};

/**
 * Polished, chosen against the other two on the rendered frame.
 *
 * Matte was tried properly rather than dismissed — AO carving the counters,
 * the darker swatch, the tightened radius — and it measured the way it looked:
 * the interquartile range halved to 73 against this one's 123, the dark
 * fraction fell from 40% to 20%, and the median rose to 172. That is the
 * numeric signature of flat. The glyph is mostly broad flat planes, and a
 * scattered surface gives a broad flat plane one value and nothing more.
 *
 * Satin measured best of the three on range alone (137) and is the one to
 * revisit if this ever reads as too bright; it is kept below rather than
 * deleted for exactly that reason.
 */
export const FINISH = FINISHES.polished;

/**
 * Where the artefact fades in, and where the ending begins.
 *
 * These, and every `p` in ARTEFACT_PATH, are authored against the SIX-chapter
 * spacing — the one the site runs when body data exists. The site may instead
 * be running the five-chapter spacing, where the same raw progress value sits
 * somewhere completely different: 0.5 is a quarter of the way into PLAYSTATION
 * on one and well past its middle on the other. Sampling authored anchors with
 * a raw value from the other spacing is what would put the artefact on the same
 * side as the copy for most of two chapters, so the value is carried across
 * before it is used, exactly the way the review states are.
 */
const STEAM_START = 0.225;
const FINAL_START = 0.89;

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
 * One glyph's own width at scale 1, with the pair's gap taken out of it. The
 * pair measures 6.7 units at the landscape offset of 1.66, so the glyph is
 * 6.7 - 2 * 1.66 wide; portrait sets a different offset and therefore a
 * different pair width, and the only way to know either is to derive them from
 * this rather than to keep two hand-measured totals that can drift apart.
 */
const GLYPH_WIDTH = 3.38;

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
  { p: 0.317, x: 1.62, y: 0.1, z: -15.9, ry: -0.3 },
  { p: 0.405, x: 1.55, y: 0.05, z: -15.7, ry: -0.24 },
  // The crossings dive. Every anchor pair used to be joined at a constant depth,
  // so the artefact swapped sides by sliding straight across the middle of the
  // frame at full size — and the middle of the frame is where the copy lives.
  // Caught on the hand-off frames: at the STEAM -> PLAYSTATION swap the glyph
  // stood on top of the trophy row and hid the platinum card outright.
  //
  // A mid anchor set six units further back turns the slide into an arc away
  // from the reader: the object recedes, passes behind the plane the type sits
  // on, and comes back. It also solves the swap being the loudest moment in a
  // chapter it does not belong to — receding reads as the scene breathing out
  // between statements.
  //
  // Dead centre was still wrong, though. The dive fixed the *size* of the
  // intrusion and not its position: a mid anchor has to lean away from whichever
  // rail the INCOMING chapter's copy holds, because that is the copy the reader
  // is arriving at and the one the artefact is about to be read against.
  //
  // Sizing that lean off the frame rather than by eye: with the camera at rest
  // at z = -8.7 and a 35° vertical fov, a plane at distance d is
  // 2 * d * tan(17.5°) = 0.631 * d units tall, and that height is the frame's
  // 900px — so one world unit is 900 / (0.631 * d) = 1427 / d pixels. (The
  // flight leaves the fov at 36.4° rather than 35°, which only ever widens the
  // frame, so every clearance worked out below is a floor and not an estimate.)
  // Both mids land within 0.12 units of the anchor that follows them, which is
  // the point: the sideways swap now finishes while the artefact is deep and
  // small, and the return is a straight run forward down its own side instead of
  // a diagonal drawn across the chapter's text.
  //
  // p 0.5, incoming PLAYSTATION, copy on the RIGHT. d = 13.5 gives 106 px/unit;
  // the pair is 6.7 units wide at the mid-chapter scale of 0.36, so 255px, half
  // of it 127px. At x = 0 the right edge sat at 720 + 127 = 847px while the
  // trophy column starts at 0.51 * 1440 = 734px — the 113px of overlap measured
  // on the frame, and what it overlapped was the platinum card. x = -1.5 moves
  // the centre to 561px and the right edge to 688px, 46px clear of the column,
  // with the left edge still 434px inside the frame.
  { p: 0.444, x: -1.5, y: -0.06, z: -22.2, ry: 0 },
  // PLAYSTATION mirrors: type moves right, so the artefact crosses to the left.
  { p: 0.507, x: -1.62, y: 0.02, z: -15.9, ry: 0.28 },
  { p: 0.57, x: -1.56, y: 0, z: -16.1, ry: 0.34 },
  // p 0.72, incoming PRESENCE, copy on the LEFT. d = 13.9 gives 103 px/unit and
  // half the pair is 124px, so x = 0 left an edge at 596px — nominally past the
  // left third at 480px, which is why it looked survivable and was not: the
  // OFFLINE headline is set large and the Discord card sits under it, and on the
  // frame the two together read as a column reaching the midline. Measuring
  // against 720px instead, x = +1.5 puts the centre at 874px and the left edge
  // at 750px, and the far side has 442px to spare.
  { p: 0.618, x: 1.5, y: -0.14, z: -22.6, ry: 0.05 },
  // PRESENCE: back to the right and further away — the quiet chapter.
  { p: 0.666, x: 1.55, y: -0.22, z: -17.6, ry: -0.3 },
  // BODY. The copy takes the left rail here, so the artefact stays right the
  // whole way and there is no side swap anywhere in this stretch — but it does
  // need anchors, or a single interpolation would carry it across two chapters
  // in one unbroken drift and the chapter would have no beat of its own. It
  // draws back and settles instead, which is the quiet before the ending.
  { p: 0.75, x: 1.52, y: -0.24, z: -18.3, ry: -0.28 },
  { p: 0.84, x: 1.5, y: -0.2, z: -18.1, ry: -0.24 },
  { p: 0.89, x: 1.48, y: -0.26, z: -17.9, ry: -0.26 },
  // The ending brings it home and closer, and hard over to the right. The
  // previous x = 0.55 was described here as clearing the left third; it did not,
  // and the frame says so. d = 6.9 makes the plane 4.35 units tall and 6.96
  // wide at 207 px/unit, and at the ending scale of 0.41 the pair covers
  // 568 x 610px of it — so x = 0.55 spanned 550-1118px against a wordmark
  // sitting at 65-925px. "ZO" was underneath the artefact outright, which is why
  // the payoff shot read as a rendering fault.
  //
  // x = 1.53 is the largest offset the frame still carries cleanly: it sets the
  // right edge at 1440 - 120 = 1320px and the left edge at 752px, so the whole
  // silhouette sits in the right half of the frame and the 120px it keeps at the
  // side is of a piece with what it keeps above and below. y = 0.22 is the 45px
  // of lift that makes those vertical margins 100px and 190px rather than 145px
  // twice — the artefact rides high, and the wordmark clears the rest by moving
  // down out of this band in CSS. z stays at -15.6: this is the shot the whole
  // scroll is for and it does not get smaller to solve a layout problem.
  { p: 1, x: 1.53, y: 0.22, z: -15.6, ry: 0 },
] as const;

export function ContinuousWorld({
  progress,
  bounds,
}: {
  progress: MutableRefObject<number>;
  /** The spacing the scroll is actually running, so authored anchors can be
   *  carried onto it. A ref rather than a prop so swapping it never re-renders
   *  the Canvas. Optional, so the component still stands alone. */
  bounds?: MutableRefObject<readonly ChapterBound[]>;
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
    // A mirror barely shows its own colour — almost everything it returns is
    // the room. A scattered surface shows a great deal of it, so the tint
    // that reads as bright chrome reads as white plaster once matte. The
    // darker swatch is what makes this graphite rather than chalk.
    color: FINISH.specular ? SCENE.chrome : SCENE.chromeSecondary,
    metalness: FINISH.face.metalness, roughness: FINISH.face.roughness,
    envMapIntensity: FINISH.face.envMapIntensity,
    clearcoat: FINISH.specular ? 0.3 : 0, clearcoatRoughness: 0.36,
    // Brushed rather than mirror-smooth. Anisotropy stretches every reflection
    // along one axis, so the slats behind the camera arrive as long vertical
    // draws down the face instead of as a single flat wash — it is the same
    // trick that makes a real brushed-steel panel read as metal in a photo.
    anisotropy: FINISH.specular ? 0.22 : 0, anisotropyRotation: Math.PI / 2,
    // A trace of thin-film. Chrome that is purely neutral looks computed; a
    // faint cold shift is what real plating does, and it should land inside the
    // palette's own blue rather than fight it.
    //
    // It was landing on salmon instead — caught on the PLAYSTATION -> PRESENCE
    // hand-off, where the right glyph came out orange. The range is the reason,
    // and not the half of it that looks like it is doing the work: with no
    // iridescenceThicknessMap bound, three.js takes the range's MAXIMUM and
    // ignores the minimum entirely, so the film was a flat 420nm at IOR 1.5.
    // That is an optical path of 2 * 1.5 * 420 = 1260nm, and a path that long
    // has no first-order peak in the visible at all — the peak that does fall
    // in it is the second order at 1260 / 2 = 630nm, which is orange. It is
    // also strongest where a face looks straight back down the barrel, which
    // is precisely the deep, nearly un-yawed anchor at p 0.72.
    //
    // 180nm at IOR 1.3 pulls the whole effect into the first order: the peak is
    // at 2 * 1.3 * 180 = 468nm, the middle of the palette's blue, and the
    // second order at 234nm is ultraviolet. As the angle opens the path can only
    // shorten, so the shift runs blue toward violet and then out of the visible
    // — there is no longer a warm band anywhere on the sweep to find.
    iridescence: FINISH.specular ? 0.2 : 0, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 180] as [number, number],
    transparent: true, opacity: 0,
  }), []);
  // The walls face sideways into a room that is nearly empty, so the same
  // damping would sink them into the background and take the glyph's edge with
  // them. They get the opposite treatment — more environment, not less, spread
  // wide enough to read as a rim rather than as a glint. The gap between this
  // and the faces above is what gives the extrusion its depth.
  const sideMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: SCENE.chromeSide,
    metalness: FINISH.side.metalness, roughness: FINISH.side.roughness,
    envMapIntensity: FINISH.side.envMapIntensity,
    clearcoat: FINISH.specular ? 0.12 : 0, clearcoatRoughness: 0.3,
    anisotropy: FINISH.specular ? 0.3 : 0, anisotropyRotation: 0,
    transparent: true, opacity: 0,
  }), []);
  const geometry = useGothicTwoGeometry();
  const { size, camera } = useThree();
  const portrait = size.width / size.height < 0.78;

  // The pair had grown into each other: the left glyph's tail ran under the
  // right one's stem, which reads as a rendering fault rather than as a
  // ligature. Widened until the silhouettes clear each other outright. It is
  // read per frame as well as in the JSX, because the pair's total width is
  // what decides how far sideways the choreography can actually go.
  const offset = portrait ? 1.22 : 1.66;

  // Materials are passed as props, so R3F will not dispose them for us.
  useEffect(() => () => {
    faceMaterial.dispose();
    sideMaterial.dispose();
  }, [faceMaterial, sideMaterial]);

  useFrame(() => {
    // Into the spacing the anchors were authored in. Identical to the raw value
    // whenever the six-chapter sequence is live, so this costs nothing there.
    const live = progress.current;
    const value = bounds
      ? transposeProgress(live, bounds.current, CHAPTER_BOUNDS) ?? live
      : live;

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
    // PLAYSTATION mirrors to the right, right again for PRESENCE, and further
    // right still for the ending, where ANKUZO takes the left rail back. The
    // swap is the reason the chapters read as a sequence rather than as three
    // versions of one screen.
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

    // Largest at the ending, but sized off the frame rather than off ambition.
    // The pair measures 6.7 x 7.2 units at scale 1; the ending's plane is 4.4
    // tall, so 0.41 fills about two thirds of the height and still clears the
    // top and bottom edges. The old 0.52 at z = -13.4 was 3.7 units tall in a
    // 3.0-unit frame — the artefact was not large, it was simply outside.
    const scale = (portrait ? 0.3 : 0.36)
      + (portrait ? 0.12 : 0.05) * ease(span(value, FINAL_START, 1));
    group.current.scale.setScalar(scale);

    const z = from.z + (to.z - from.z) * t - setback;

    // The lateral swing is clamped against the frame the artefact is standing
    // in, rather than trusted. Every x above is authored against the landscape
    // shot and portrait gets one blanket 0.36 on top of it, which is a guess and
    // not a fit — and at the ending the guess loses: portrait opens the fov to
    // 42° and stands 1.7 further back, giving a plane 3.09 units wide, while the
    // pair at its narrower offset is 2.44 of them. That leaves 0.26 units of
    // room in total, so the ending's offset hangs a glyph over the edge, and the
    // mid-chapter anchors were already trimming ~25px off one side before this
    // change made the ending worse. Two trig calls turn the header's claim that
    // "each x keeps the whole silhouette inside the frame" from an assertion
    // about the numbers into a property of them, on every aspect ratio. It never
    // engages on desktop: the tightest landscape limit is 2.11 against a
    // requested 1.53.
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 35;
    const halfHeight = Math.abs(camera.position.z - z) * Math.tan((fov * Math.PI) / 360);
    const halfWidth = halfHeight * (size.width / size.height);
    // The last 4% is held back so the limit reads as a margin; a silhouette
    // stopped exactly on the edge looks clipped even when it is not.
    const limit = Math.max(0, halfWidth - (offset * 2 + GLYPH_WIDTH) * 0.5 * scale - halfWidth * 0.04);
    const x = (from.x + (to.x - from.x) * t) * sideways;

    group.current.position.set(
      Math.min(Math.max(x, -limit), limit),
      from.y + (to.y - from.y) * t,
      z,
    );
    // Always angled back toward the reader's side of the frame.
    group.current.rotation.y = from.ry + (to.ry - from.ry) * t;
    group.current.rotation.x = 0.03 * Math.sin((value - STEAM_START) * 2.2);
  });

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
