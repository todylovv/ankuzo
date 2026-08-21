"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, MutableRefObject } from "react";
import {
  ACESFilmicToneMapping,
  CatmullRomCurve3,
  PerspectiveCamera,
  Vector3,
} from "three";
import { Atmosphere } from "./Atmosphere";
import { ContinuousWorld } from "./ContinuousWorld";
import { PostFx } from "./PostFx";
import { DiscordCard } from "./DiscordCard";
import { GameCard } from "./GameCard";
import { RibbonField } from "./RibbonField";
import { PortalTwentyTwo } from "./FracturedTwo";
import { CHAPTERS, PORTAL_END, chapterFor, clamp, remapPortalTravel, smoothstep } from "./progress";
import { SCENE } from "./theme";
import { useExperienceData } from "../data/useExperienceData";
import { useLivePresence } from "../data/useLivePresence";
import type { ExperienceSource } from "../../lib/experience-data";

const REVIEW_STATES = [
  { scene: "portal", frame: "pristine", progress: 0 },
  { scene: "portal", frame: "stress", progress: 0.066 },
  { scene: "portal", frame: "cracks", progress: 0.105 },
  { scene: "portal", frame: "fracture", progress: 0.132 },
  { scene: "portal", frame: "breakthrough", progress: 0.18 },
  { scene: "steam", frame: "arrival", progress: 0.26 },
  { scene: "steam", frame: "hold", progress: 0.36 },
  { scene: "playstation", frame: "arrival", progress: 0.49 },
  { scene: "playstation", frame: "hold", progress: 0.58 },
  { scene: "presence", frame: "hold", progress: 0.75 },
  { scene: "final", frame: "22", progress: 1 },
] as const;

/**
 * The blinds standing behind the camera, which is the only thing the artefact's
 * front faces can see.
 *
 * The count is the point, not the brightness. A flat face has a nearly constant
 * normal, so it samples the environment across a very narrow arc — measured on
 * the rendered frame, four wide slats put 88% of the surface in one grey band,
 * and four narrow ones put 77% of it in shadow. Neither is metal, because in
 * both cases the whole face landed inside a single feature of the room.
 *
 * Twelve of them, spaced closer than the arc a face sweeps, means the surface
 * crosses light and dark several times over: bright bands and dark bands on one
 * face, which is what a mirror in a room with blinds actually shows. The widths
 * and intensities are irregular so the result reads as a place rather than as a
 * test pattern, and a couple carry the warm and cool ends of the palette so the
 * metal is not uniformly one temperature.
 */
type Slat = {
  x: number;
  y: number;
  width: number;
  intensity: number;
  /** Tints this blind toward the cold end of the palette. */
  cool?: boolean;
  /** The single warm one, so the metal is not all one temperature. */
  warm?: boolean;
};

const SLATS: readonly Slat[] = [
  { x: -7.2, y: 2.2, width: 0.42, intensity: 6.5, cool: true },
  { x: -6.1, y: 1.0, width: 0.22, intensity: 3.0 },
  { x: -5.2, y: 2.8, width: 0.5, intensity: 9.5 },
  { x: -4.0, y: 0.6, width: 0.26, intensity: 4.2, cool: true },
  { x: -2.9, y: 2.4, width: 0.6, intensity: 11.0 },
  { x: -1.7, y: 1.2, width: 0.24, intensity: 3.4 },
  { x: -0.5, y: 2.6, width: 0.46, intensity: 8.0 },
  { x: 0.8, y: 0.8, width: 0.3, intensity: 4.6, cool: true },
  { x: 2.0, y: 2.5, width: 0.66, intensity: 12.0 },
  { x: 3.3, y: 1.0, width: 0.24, intensity: 3.2, warm: true },
  { x: 4.6, y: 2.3, width: 0.44, intensity: 7.5 },
  { x: 6.0, y: 1.4, width: 0.28, intensity: 4.0, cool: true },
];

/** Controls that own the space bar / arrow keys themselves. */
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [contenteditable]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";




function subscribeReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

/**
 * The scene's fixed lighting. With one theme there is nothing to interpolate,
 * so this simply declares the room: colours are set once at mount instead of
 * being mixed on every frame, which also takes four per-frame colour blends
 * and a CSSOM write out of the render loop.
 */
function SceneLighting() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(SCENE.background, 1);
    gl.toneMappingExposure = SCENE.exposure;
  }, [gl]);

  return (
    <>
      <color attach="background" args={[SCENE.background]} />
      <fog attach="fog" args={[SCENE.depth, 16, 36]} />
      <ambientLight intensity={SCENE.ambientIntensity} color={SCENE.ambient} />
      <directionalLight position={[-6, 9, 9]} intensity={SCENE.keyIntensity} color={SCENE.key} />
      <directionalLight position={[7, 0.5, 4]} intensity={SCENE.fillIntensity} color={SCENE.fill} />
      <pointLight position={[0, 0, -5]} intensity={SCENE.rearIntensity} color={SCENE.rear} distance={13} decay={1.8} />
    </>
  );
}

function ProgressDriver({ target, rendered, portal, immediate, onChapterChange }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  immediate: boolean;
  onChapterChange: (chapter: string) => void;
}) {
  const lastChapter = useRef("");
  useFrame((_, delta) => {
    if (immediate) rendered.current = target.current;
    else {
      const blend = 1 - Math.exp(-delta * 6.4);
      rendered.current += (target.current - rendered.current) * blend;
      if (Math.abs(target.current - rendered.current) < 0.00035) rendered.current = target.current;
    }
    portal.current = clamp(rendered.current / PORTAL_END);
    const activeChapter = chapterFor(rendered.current);
    if (activeChapter !== lastChapter.current) {
      document.documentElement.dataset.chapter = activeChapter;
      lastChapter.current = activeChapter;
      // Keep the React tree in step with data-chapter so the inactive chapter
      // blocks can be marked inert in the same beat the CSS reacts to.
      onChapterChange(activeChapter);
    }
    document.documentElement.style.setProperty("--experience-progress", rendered.current.toFixed(4));
    document.documentElement.style.setProperty("--portal-progress", portal.current.toFixed(4));
  });
  return null;
}

// The camera follows the authored curve and nothing else. It used to also
// drift with the cursor, which read as the shot wobbling rather than moving —
// on a slow flight the parallax competes with the travel instead of
// supporting it, and it is the most vestibular-hostile motion on the page.
function CameraRig({ portal, master }: {
  portal: MutableRefObject<number>;
  master: MutableRefObject<number>;
}) {
  const { camera, size } = useThree();
  const portrait = size.width / size.height < 0.78;
  const current = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const portalCurve = useMemo(() => new CatmullRomCurve3(
    // Monotonic on every axis. The previous knots reversed direction three
    // times on X alone (0.12 → 0.07 → 0.14 → 0.04 → 0 → -0.04 → 0.08), and
    // because the look target is sampled from this same curve slightly ahead,
    // the weave was doubled: the shot swayed instead of travelling. The last
    // knot also has to land exactly where the post-portal rig starts, or the
    // camera jumps at the hand-off.
    portrait
      ? [
          new Vector3(0.06, 0.1, 14.2), new Vector3(0.05, 0.076, 10.8),
          new Vector3(0.04, 0.052, 6.4), new Vector3(0.028, 0.032, 2.6),
          new Vector3(0.017, 0.017, -0.55), new Vector3(0.008, 0.006, -4.3),
          new Vector3(0, 0, -8.6),
        ]
      : [
          new Vector3(0.1, 0.1, 13.5), new Vector3(0.085, 0.076, 9.7),
          new Vector3(0.065, 0.052, 5.6), new Vector3(0.045, 0.032, 2.2),
          new Vector3(0.028, 0.017, -0.55), new Vector3(0.012, 0.006, -4.2),
          new Vector3(0, 0, -8.7),
        ],
    false, "centripetal", 0.25,
  ), [portrait]);

  useFrame(() => {
    const masterValue = master.current;
    if (masterValue <= PORTAL_END) {
      const travel = Math.min(0.999, remapPortalTravel(portal.current));
      portalCurve.getPointAt(travel, current);
      portalCurve.getPointAt(Math.min(0.999, travel + 0.032), look);
    } else {
      const libraryDrift = smoothstep(0.22, 0.43, masterValue);
      const platformDrift = smoothstep(0.43, 0.6, masterValue);
      const onlineDrift = smoothstep(0.6, 0.76, masterValue);
      const buildDrift = smoothstep(0.76, 0.91, masterValue);
      current.set(
        -0.12 * libraryDrift + 0.27 * platformDrift - 0.18 * onlineDrift + 0.1 * buildDrift,
        0.03 * libraryDrift - 0.055 * onlineDrift + 0.025 * buildDrift,
        (portrait ? -8.6 : -8.7) - 0.22 * libraryDrift + 0.28 * platformDrift + 0.1 * onlineDrift - 0.14 * buildDrift,
      );
      look.set(0, 0, portrait ? -13.6 : -14.25);
    }
    camera.position.copy(current);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    if (camera instanceof PerspectiveCamera) {
      const targetFov = portrait ? 42 : 35 + smoothstep(0.145, 0.205, masterValue) * 1.4;
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = targetFov;
        camera.near = 0.035;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

function ExperienceScene({ target, rendered, portal, immediate, archiveDensity, reducedMotion, onChapterChange }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  immediate: boolean;
  /** One background point per record, so the depth is the size of the archive. */
  /** Scales the ribbon density — the archive's size, gently applied. */
  archiveDensity: number;
  reducedMotion: boolean;
  onChapterChange: (chapter: string) => void;
}) {
  return (
    <>
      <Atmosphere reducedMotion={reducedMotion} />
      <SceneLighting />
      {/* What the mirror is given to show.

          A flat face has a constant normal, so it samples the environment in a
          near-constant direction and can only be as interesting as whatever
          sits there. One huge uniform panel behind the camera — the previous
          arrangement — meant the glyph faithfully reflected a blank white wall,
          which is exactly what "the 22 is just white" describes. No material
          setting can rescue that; the room has to have something in it.

          So this is built like a photographer's light tent with slats: bright
          strips separated by dark gaps, at the angular scale the glyph actually
          subtends. As the reflected vector sweeps across a face it now crosses
          light, gap, light — and that sweep IS the gradient. */}
      <Environment resolution={256}>
        {/* Narrow and hot, with real darkness between them.

            Measured on the rendered frame, the metal was sitting with a median
            luminance of 102 and 88% of its pixels inside one mid-grey band —
            the signature of matte paint. Polished chrome is bimodal instead:
            large near-black areas reflecting an unlit room, small near-white
            ones reflecting a source, and a fast transition between them.

            The previous slats were wide and moderate, so the reflection swept
            across them and averaged out to exactly that grey. Total light is
            about the same here; it is concentrated instead. Brightness was
            never the missing thing — contrast was. */}
        {SLATS.map((slat, index) => (
          <Lightformer key={index} form="rect" intensity={slat.intensity}
            color={slat.warm ? SCENE.reflectionWarm : slat.cool ? SCENE.reflectionSky : SCENE.reflectionEdge}
            position={[slat.x, slat.y, 8.8]} rotation={[0, Math.PI, 0]}
            scale={[slat.width, 13, 1]} />
        ))}

        {/* Sky and floor keep the top and bottom of the glyph from matching.
            Both are kept low: they are the "unlit room" the dark half of the
            surface is supposed to be reflecting, and lifting them is what
            collapses the range back into grey. */}
        <Lightformer form="rect" intensity={0.55} color={SCENE.reflectionSky}
          position={[-1.2, 7.4, 3.4]} rotation={[0.5, 0.14, 0]} scale={[15, 4.2, 1]} />
        <Lightformer form="rect" intensity={0.22} color={SCENE.reflectionFloor}
          position={[0, -6.2, -1]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 9, 1]} />

        {/* The two specular edges that draw the silhouette. */}
        <Lightformer form="rect" intensity={4.4} color={SCENE.reflectionEdge}
          position={[-3.1, 0.2, 5.6]} rotation={[0, 0.5, 0.06]} scale={[0.22, 9, 1]} />
        <Lightformer form="rect" intensity={3} color={SCENE.reflectionEdge}
          position={[3.4, 0.4, 5.4]} rotation={[0, -0.46, -0.07]} scale={[0.3, 7.4, 1]} />

        {/* One warm sliver, low and dim: uniformly cold chrome starts to read
            as plastic, and a single warm bounce is what stops it. */}
        <Lightformer form="rect" intensity={2.2} color={SCENE.reflectionWarm}
          position={[6.2, -2.2, 2.6]} rotation={[0, -0.95, 0]} scale={[0.5, 5, 1]} />

        {/* Rim from behind the artefact, separating it from the dust. */}
        <Lightformer form="rect" intensity={0.9} color={SCENE.reflectionSky}
          position={[0, 1.5, -22]} rotation={[0, 0, 0]} scale={[9, 7, 1]} />
      </Environment>
      <RibbonField progress={rendered} density={archiveDensity} reducedMotion={reducedMotion} />
      <ContinuousWorld progress={rendered} />
      <PortalTwentyTwo progress={portal} masterProgress={rendered} />
      <CameraRig portal={portal} master={rendered} />
      <PostFx reducedMotion={reducedMotion} />
      <ProgressDriver target={target} rendered={rendered} portal={portal} immediate={immediate}
        onChapterChange={onChapterChange} />
    </>
  );
}

export function PortalExperience() {
  const stage = useRef<HTMLElement>(null);
  const targetProgress = useRef(0);
  const renderedProgress = useRef(0);
  const portalProgress = useRef(0);
  const touchY = useRef<number | null>(null);
  const reduced = useRef(false);
  // The motion preference lives outside React, so it is read through
  // useSyncExternalStore: the first client render matches the server snapshot,
  // and later changes arrive through a real subscription rather than a
  // one-time read at mount.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const [activeChapter, setActiveChapter] = useState<string>(() => chapterFor(0));
  // Every source, immediately. These snapshots ARE the content of the middle of
  // the site, so staging them behind scroll progress made the copy hostage to
  // the render loop: if the frame loop stalls for any reason the chapters show
  // zeros, which reads as broken rather than as loading. ~126KB of JSON is a
  // cheap price for content that is always there when its chapter arrives.
  const enabledSources = useMemo<ExperienceSource[]>(() => ["steam", "playstation", "discord"], []);
  const { data: experienceData } = useExperienceData({ enabledSources });

  const livePresence = useLivePresence(experienceData.discord.id);

  // The middle of the site is carried by real records, not by labels. Each
  // falls back to the committed snapshot rather than to zero: a chapter that
  // says "0 hours" would be a lie, while a slightly stale number is merely old.
  const figures = useMemo(() => {
    const steam = experienceData.steam;
    const trophies = experienceData.playstation.trophies;
    const discord = experienceData.discord;

    const topGames = steam.featured.slice(0, 5).map((game) => ({
      id: game.id,
      title: game.title,
      hours: Math.round(game.hours ?? 0),
      artwork: game.artwork ?? game.icon,
    })).filter((game) => game.hours > 0);
    const topHours = topGames[0]?.hours ?? 0;
    const totalHours = Math.round(steam.totalHours ?? 0);
    const share = totalHours > 0 && topHours > 0 ? Math.round((topHours / totalHours) * 100) : 0;

    const tiers = [
      { id: "platinum", label: "PLATINUM", value: trophies.platinum ?? 0 },
      { id: "gold", label: "GOLD", value: trophies.gold ?? 0 },
      { id: "silver", label: "SILVER", value: trophies.silver ?? 0 },
      { id: "bronze", label: "BRONZE", value: trophies.bronze ?? 0 },
    ];
    const tierPeak = Math.max(1, ...tiers.map((tier) => tier.value));

    const archiveCount = (steam.totalGames ?? steam.games.length)
      + experienceData.playstation.games.length;

    return {
      // 416 records maps to roughly one; a bigger library thickens the room.
      archiveDensity: Math.min(1.5, Math.max(0.6, archiveCount / 420)),
      steamProfiles: steam.profiles.slice(0, 2).map((profile) => ({
        id: profile.id,
        nickname: profile.nickname,
        avatar: profile.avatar,
        url: profile.profileUrl,
        online: profile.online,
        currentGame: profile.currentGame,
        hours: Math.round(profile.totalHours ?? 0),
        games: profile.gameCount ?? 0,
      })),
      steamHours: totalHours,
      steamGames: steam.totalGames ?? steam.games.length,
      steamNote: share > 0
        ? `${steam.totalGames ?? steam.games.length} GAMES · ${share}% OF IT IN ONE`
        : `${steam.totalGames ?? steam.games.length} GAMES`,
      topGames,
      topPeak: Math.max(1, topHours),
      trophies: trophies.total ?? 0,
      tiers,
      tierPeak,
      playstationNote: [
        trophies.level ? `LEVEL ${trophies.level}` : null,
        `${experienceData.playstation.games.length} TITLES`,
        experienceData.playstation.onlineId ? `@${experienceData.playstation.onlineId}` : null,
      ].filter(Boolean).join(" · "),
      discord,
      presence: livePresence?.presence ?? discord.presence,
      isLive: Boolean(livePresence),
      activity: livePresence?.activity,
      activityDetail: livePresence?.activityDetail,
    };
  }, [experienceData, livePresence]);
  const searchParams = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const queryScene = searchParams?.get("scene") ?? null;
  const queryFrame = searchParams?.get("frame") ?? null;
  const reviewMode = searchParams?.get("review") === "1";
  const reviewDevice = searchParams?.get("device") === "mobile" ? "mobile" : "desktop";
  // The twelve-button review strip is authoring chrome. It stays automatic in
  // development, and in a production build it needs an extra, explicit
  // `?reviewNav=1` opt-in so a shared `?review=1` capture link (which still
  // pins a deterministic scene state) never paints debug UI over the scene.
  const reviewNavVisible = reviewMode
    && (process.env.NODE_ENV !== "production" || searchParams?.get("reviewNav") === "1");
  const reviewState = reviewMode && queryScene && queryFrame
    ? REVIEW_STATES.find((state) => state.scene === queryScene && state.frame === queryFrame)
    : undefined;

  const setProgress = useCallback((value: number, immediate = false) => {
    const next = clamp(value);
    targetProgress.current = next;
    if (immediate) {
      renderedProgress.current = next;
      portalProgress.current = clamp(next / PORTAL_END);
      document.documentElement.style.setProperty("--experience-progress", next.toFixed(4));
      document.documentElement.style.setProperty("--portal-progress", portalProgress.current.toFixed(4));
      document.documentElement.dataset.chapter = chapterFor(next);
    }
  }, []);

  // `data-theme` on <html> is the source of truth; writing it notifies the
  // subscription above, which re-renders the switch with the new label.

  // Mirror the theme the head bootstrap picked into the scene driver. On the
  // very first pass the progress jumps instead of easing, so a dark reload does
  // not flash through the light palette.

  // prefers-reduced-motion is a live preference, so every consumer (scroll
  // speed, camera parallax, architecture drift) reads the current value.
  useEffect(() => {
    reduced.current = reducedMotion;
    if (reducedMotion) document.documentElement.dataset.experienceReduced = "true";
    else delete document.documentElement.dataset.experienceReduced;
    return () => { delete document.documentElement.dataset.experienceReduced; };
  }, [reducedMotion]);

  const navigateReview = (scene: string, frame: string, device = reviewDevice) => {
    const params = new URLSearchParams(window.location.search);
    params.set("review", "1"); params.set("scene", scene); params.set("frame", frame);
    if (device === "mobile") params.set("device", "mobile"); else params.delete("device");
    window.location.assign(`?${params.toString()}`);
  };

  useEffect(() => {
    if (!stage.current) return;
    document.documentElement.dataset.experienceLocked = "true";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    if (reviewState) {
      setProgress(reviewState.progress, true);
      document.documentElement.dataset.capture = "true";
      return () => {
        delete document.documentElement.dataset.capture;
        delete document.documentElement.dataset.experienceLocked;
      };
    }

    setProgress(0, true);

    const wheelPixels = (event: WheelEvent) => {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 18;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
      return event.deltaY;
    };
    const onWheel = (event: WheelEvent) => {
      // Ctrl+wheel is the browser's zoom gesture (trackpad pinch included).
      // Swallowing it would trap users at 100% — WCAG 1.4.4.
      if (event.ctrlKey) return;
      event.preventDefault();
      const delta = wheelPixels(event);
      const speed = reduced.current ? 0.0005 : 0.000145;
      setProgress(targetProgress.current + delta * speed, reduced.current);
    };
    const onTouchStart = (event: TouchEvent) => {
      // A second finger means pinch-zoom, not a scrub.
      touchY.current = event.touches.length > 1 ? null : event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) { touchY.current = null; return; }
      const nextY = event.touches[0]?.clientY;
      if (touchY.current === null || nextY === undefined) return;
      event.preventDefault();
      const delta = touchY.current - nextY;
      touchY.current = nextY;
      setProgress(targetProgress.current + delta * (reduced.current ? 0.002 : 0.00052), reduced.current);
    };
    const onTouchEnd = () => { touchY.current = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      // Never steal keys from a focused control: the space bar has to keep
      // activating the theme switch and the six chapter buttons.
      const target = event.target;
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return;
      const direction = ["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)
        ? 1 : ["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key) ? -1 : 0;
      if (direction === 0 && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      if (event.key === "Home") setProgress(0, reduced.current);
      else if (event.key === "End") setProgress(1, reduced.current);
      else setProgress(targetProgress.current + direction * (reduced.current ? 0.17 : 0.032), reduced.current);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      delete document.documentElement.dataset.experienceLocked;
      delete document.documentElement.dataset.chapter;
    };
  }, [reviewState, setProgress]);

  const skipPortal = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setProgress(0.24, true);
  };

  /**
   * Only the chapter the camera is actually in stays in the accessibility tree.
   * The others are visually faded out, so leaving them exposed made a screen
   * reader announce all six chapters back to back.
   */
  const chapterState = (id: string) => {
    const hidden = activeChapter !== id;
    // `data-active` is what the staggered row reveal keys off: CSS cannot see
    // React state, and driving it from the same place as `inert` keeps the
    // animation and the accessibility tree from ever disagreeing.
    return {
      inert: hidden,
      "aria-hidden": hidden || undefined,
      "data-active": hidden ? undefined : "true",
    };
  };

  return (
    // The shell's visible copy is English; the document itself stays lang="ru".
    <main lang="en" className={`experience-shell ${reviewDevice === "mobile" ? "review-mobile" : ""}`}>
      <a className="skip-link" href="#library" onClick={skipPortal}>Skip the portal</a>
      <section className="experience-stage" ref={stage} aria-labelledby="experience-title">
        <Canvas className="experience-canvas" dpr={[1, 1.35]}
          camera={{ position: [0, 0, 13.5], fov: 35, near: 0.035, far: 70 }}
          gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.02 }}>
          <ExperienceScene target={targetProgress} rendered={renderedProgress} portal={portalProgress}
            archiveDensity={figures.archiveDensity} reducedMotion={reducedMotion} onChapterChange={setActiveChapter}
            immediate={Boolean(reviewState) || reducedMotion} />
        </Canvas>

        <header className="experience-header">
          <button type="button" className="wordmark" onClick={() => setProgress(0)}>ANKUZO</button>
          <p id="experience-title" className="sr-only">CONTINUOUS SESSION / 22</p>
          <div className="header-tools">
          </div>
        </header>

        <div className="chapter-copy chapter-copy--portal" {...chapterState("portal")}>
          {/* The entrance is the scene itself: no overlay type competes with it.
              The heading stays for the document outline and screen readers. */}
          <h1 className="sr-only">22</h1>
        </div>
        <div className="chapter-copy chapter-copy--steam" id="steam" {...chapterState("steam")}>
          <p className="chapter-eyebrow">STEAM / PC</p>
          <h2 className="chapter-figure">
            <span className="figure-count" style={{ "--figure-target": figures.steamHours } as CSSProperties}
              aria-label={`${figures.steamHours} hours`} />
            <span className="figure-unit">HOURS</span>
          </h2>
          <p className="chapter-note">{figures.steamNote}</p>
          <ul className="account-row">
            {figures.steamProfiles.map((profile) => (
              <li key={profile.id}>
                <a className="account" href={profile.url ?? undefined}
                  target="_blank" rel="noreferrer noopener">
                  <span className="account-portrait">
                    {profile.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={profile.avatar} alt="" width={54} height={54} loading="lazy" />
                    ) : null}
                    <i className={`account-state account-state--${profile.online ? "online" : "offline"}`}
                      aria-hidden="true" />
                  </span>
                  <span className="account-body">
                    <b>{profile.nickname}</b>
                    <em>{profile.currentGame ? profile.currentGame : profile.online ? "ONLINE" : "OFFLINE"}</em>
                    <span className="account-stats">
                      <span><b>{profile.games}</b> games</span>
                      <span><b>{profile.hours.toLocaleString("en-US")}</b> h</span>
                    </span>
                  </span>
                  <span className="account-go" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <ol className="game-row">
            {figures.topGames.map((game, index) => (
              <GameCard key={game.id} rank={index + 1} title={game.title} hours={game.hours}
                artwork={game.artwork} share={game.hours / figures.topPeak} featured={index === 0} />
            ))}
          </ol>
        </div>
        <div className="chapter-copy chapter-copy--playstation" {...chapterState("playstation")}>
          <p className="chapter-eyebrow">
            PLAYSTATION
            <svg className="ps-shapes" viewBox="0 0 74 12" aria-hidden="true">
              <path d="M5 2 8.6 9H1.4z" />
              <circle cx="24" cy="6" r="3.6" />
              <path d="M40.3 3.1 43 5.8l2.7-2.7 1.4 1.4L44.4 7.2l2.7 2.7-1.4 1.4L43 8.6l-2.7 2.7-1.4-1.4 2.7-2.7-2.7-2.7z" />
              <path d="M62.4 2.4h9.2v9.2h-9.2z" />
            </svg>
          </p>
          <h2 className="chapter-figure">
            <span className="figure-count" style={{ "--figure-target": figures.trophies } as CSSProperties}
              aria-label={`${figures.trophies} trophies`} />
            <span className="figure-unit">TROPHIES</span>
          </h2>
          <p className="chapter-note">{figures.playstationNote}</p>
          <ol className="tier-grid">
            {figures.tiers.map((tier) => (
              <li key={tier.id} data-tier={tier.id} data-empty={tier.value === 0 ? "true" : undefined}>
                <svg className="tier-cup" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.6 2.4h10.8v4.7a5.4 5.4 0 0 1-10.8 0z" />
                  <path d="M10.8 12.5h2.4v4.6h-2.4z" />
                  <path d="M7.4 17.4h9.2v2.6H7.4z" />
                  <path d="M18.6 3.9h3.3v2.4a3.3 3.3 0 0 1-3.3 3.3zM5.4 3.9H2.1v2.4a3.3 3.3 0 0 0 3.3 3.3z" />
                </svg>
                <b>{tier.value}</b>
                <span>{tier.label}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="chapter-copy chapter-copy--presence" {...chapterState("presence")}>
          <p className="chapter-eyebrow">DISCORD{figures.isLive ? " / LIVE" : " / LAST KNOWN"}</p>
          <h2 className="chapter-figure chapter-figure--word">
            <span className={`presence-dot presence-dot--${figures.presence}`} aria-hidden="true" />
            {figures.presence.toUpperCase()}
          </h2>
          <DiscordCard discord={figures.discord} activity={figures.activity}
            activityDetail={figures.activityDetail} />
          <p className="chapter-note">
            <a className="ts-invite" href="https://tmspk.gg/RiaD9HgO" target="_blank" rel="noreferrer noopener">
              TEAMSPEAK — JOIN
            </a>
            <span> · SAME MACHINE AS THIS PAGE</span>
          </p>
        </div>
        <div className="chapter-copy chapter-copy--final" {...chapterState("final")}>
          <h2>ANKUZO</h2><span>IDENTITY RECONSTRUCTED</span>
        </div>

        <nav className="chapter-nav" aria-label="Experience chapters">
          {CHAPTERS.map((chapter) => (
            <button key={chapter.id} type="button" data-target-chapter={chapter.id}
              onClick={() => setProgress(chapter.progress, reducedMotion)}
              aria-label={`${chapter.index} ${chapter.label}`}>
              <i /><b>{chapter.label}</b>
            </button>
          ))}
        </nav>

        <div className="experience-meter" aria-hidden="true"><i><b /></i></div>

        {reviewNavVisible && (
          <nav className="review-nav" aria-label="Experience review states">
            <div>{REVIEW_STATES.map((state) => (
              <button type="button" className={queryScene === state.scene && queryFrame === state.frame ? "active" : ""}
                onClick={() => navigateReview(state.scene, state.frame)} key={`${state.scene}-${state.frame}`}>
                {state.scene}/{state.frame}
              </button>
            ))}</div>
            <div>
              <button type="button" className={reviewDevice === "desktop" ? "active" : ""}
                onClick={() => navigateReview(queryScene ?? "portal", queryFrame ?? "pristine", "desktop")}>desktop</button>
              <button type="button" className={reviewDevice === "mobile" ? "active" : ""}
                onClick={() => navigateReview(queryScene ?? "portal", queryFrame ?? "pristine", "mobile")}>mobile</button>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}
