"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, MutableRefObject } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Fog,
  PerspectiveCamera,
  PointLight,
  Vector3,
} from "three";
import { ContinuousWorld } from "./ContinuousWorld";
import { PortalTwentyTwo } from "./FracturedTwo";
import { GothicEnvironment } from "./GothicEnvironment";
import { CHAPTERS, PORTAL_END, chapterFor, clamp, remapPortalTravel, smoothstep } from "./progress";
import { DARK_PALETTE, LIGHT_PALETTE, mixColor, mixNumber } from "./theme";
import type { ThemeName } from "./theme";
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

/** Controls that own the space bar / arrow keys themselves. */
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [contenteditable]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function themeFromDocument(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** The head bootstrap and the switch both write `data-theme`; watch that. */
function subscribeDocumentTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Server (and first hydration pass) render the neutral theme, never a guess. */
function getServerThemeSnapshot(): ThemeName {
  return "light";
}

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

function ThemeSceneDriver({
  target,
  progress,
  immediate,
}: {
  target: MutableRefObject<number>;
  progress: MutableRefObject<number>;
  immediate: boolean;
}) {
  const ambient = useRef<AmbientLight>(null);
  const key = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const rear = useRef<PointLight>(null);
  const working = useMemo(() => new Color(), []);
  const { scene, gl } = useThree();

  useFrame((_, delta) => {
    if (immediate) progress.current = target.current;
    else {
      progress.current += (target.current - progress.current) * (1 - Math.exp(-delta * 7.2));
      if (Math.abs(target.current - progress.current) < 0.001) progress.current = target.current;
    }
    const t = progress.current;
    if (scene.background instanceof Color) {
      mixColor(scene.background, LIGHT_PALETTE.background, DARK_PALETTE.background, t);
    }
    if (scene.fog instanceof Fog) {
      mixColor(scene.fog.color, LIGHT_PALETTE.depth, DARK_PALETTE.depth, t);
      scene.fog.near = mixNumber(15.5, 17, t);
      scene.fog.far = mixNumber(38, 34, t);
    }
    if (ambient.current) {
      mixColor(ambient.current.color, LIGHT_PALETTE.ambient, DARK_PALETTE.ambient, t);
      ambient.current.intensity = mixNumber(LIGHT_PALETTE.ambientIntensity, DARK_PALETTE.ambientIntensity, t);
    }
    if (key.current) {
      mixColor(key.current.color, LIGHT_PALETTE.key, DARK_PALETTE.key, t);
      key.current.intensity = mixNumber(LIGHT_PALETTE.keyIntensity, DARK_PALETTE.keyIntensity, t);
    }
    if (fill.current) {
      mixColor(fill.current.color, LIGHT_PALETTE.fill, DARK_PALETTE.fill, t);
      fill.current.intensity = mixNumber(LIGHT_PALETTE.fillIntensity, DARK_PALETTE.fillIntensity, t);
    }
    if (rear.current) {
      mixColor(rear.current.color, LIGHT_PALETTE.rear, DARK_PALETTE.rear, t);
      rear.current.intensity = mixNumber(LIGHT_PALETTE.rearIntensity, DARK_PALETTE.rearIntensity, t);
    }
    mixColor(working, LIGHT_PALETTE.background, DARK_PALETTE.background, t);
    gl.setClearColor(working, 1);
    gl.toneMappingExposure = mixNumber(LIGHT_PALETTE.exposure, DARK_PALETTE.exposure, t);
    document.documentElement.style.setProperty("--theme-progress", t.toFixed(3));
  });

  return (
    <>
      <color attach="background" args={[LIGHT_PALETTE.background]} />
      <fog attach="fog" args={[LIGHT_PALETTE.depth, 15.5, 38]} />
      <ambientLight ref={ambient} intensity={LIGHT_PALETTE.ambientIntensity} color={LIGHT_PALETTE.ambient} />
      <directionalLight ref={key} position={[-6, 9, 9]} intensity={LIGHT_PALETTE.keyIntensity} color={LIGHT_PALETTE.key} />
      <directionalLight ref={fill} position={[7, 0.5, 4]} intensity={LIGHT_PALETTE.fillIntensity} color={LIGHT_PALETTE.fill} />
      <pointLight ref={rear} position={[0, 0, -5]} intensity={LIGHT_PALETTE.rearIntensity} color={LIGHT_PALETTE.rear} distance={13} decay={1.8} />
    </>
  );
}

function ProgressDriver({ target, rendered, portal, immediate, onDataStage, onChapterChange }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  immediate: boolean;
  onDataStage: (stage: number) => void;
  onChapterChange: (chapter: string) => void;
}) {
  const lastChapter = useRef("");
  const lastDataStage = useRef(0);
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
    // Fetch well before the first data chapter arrives, or its number would
    // count up from a placeholder zero while the request is still in flight.
    const dataStage = rendered.current >= 0.4 ? 2 : rendered.current >= 0.06 ? 1 : 0;
    if (dataStage > lastDataStage.current) {
      lastDataStage.current = dataStage;
      onDataStage(dataStage);
    }
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

function ExperienceScene({ target, rendered, portal, themeTarget, themeProgress, immediate, onDataStage, onChapterChange }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  themeTarget: MutableRefObject<number>;
  themeProgress: MutableRefObject<number>;
  immediate: boolean;
  onDataStage: (stage: number) => void;
  onChapterChange: (chapter: string) => void;
}) {
  return (
    <>
      <ThemeSceneDriver target={themeTarget} progress={themeProgress} immediate={immediate} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4.8} color={LIGHT_PALETTE.reflectionTop} position={[-4.8, 5.4, 5.6]} rotation={[0.15, 0.3, 0.1]} scale={[6.4, 1.35, 1]} />
        <Lightformer form="rect" intensity={3.6} color={LIGHT_PALETTE.reflectionSide} position={[5.8, 0.4, 2.7]} rotation={[0, -0.88, -0.08]} scale={[1.2, 7.4, 1]} />
        <Lightformer form="rect" intensity={11.5} color={LIGHT_PALETTE.reflectionEdge} position={[-2.35, 0.15, 5.2]} rotation={[0, 0.5, 0.07]} scale={[0.16, 8.2, 1]} />
        <Lightformer form="rect" intensity={8.4} color={LIGHT_PALETTE.reflectionTop} position={[2.65, 0.5, 5.1]} rotation={[0, -0.46, -0.08]} scale={[0.24, 6.7, 1]} />
        <Lightformer form="rect" intensity={2.2} color={LIGHT_PALETTE.reflectionShadow} position={[-6.4, -0.2, 0.4]} rotation={[0, 0.78, 0]} scale={[1.3, 5.8, 1]} />
        <Lightformer form="rect" intensity={1.55} color={LIGHT_PALETTE.reflectionFloor} position={[0, -4.8, -3]} rotation={[Math.PI / 2, 0, 0]} scale={[5.4, 0.75, 1]} />
      </Environment>
      <GothicEnvironment themeProgress={themeProgress} />
      <ContinuousWorld progress={rendered} themeProgress={themeProgress} />
      <PortalTwentyTwo progress={portal} masterProgress={rendered} themeProgress={themeProgress} />
      <CameraRig portal={portal} master={rendered} />
      <ProgressDriver target={target} rendered={rendered} portal={portal} immediate={immediate}
        onDataStage={onDataStage} onChapterChange={onChapterChange} />
    </>
  );
}

export function PortalExperience() {
  const stage = useRef<HTMLElement>(null);
  const targetProgress = useRef(0);
  const renderedProgress = useRef(0);
  const portalProgress = useRef(0);
  // Scene-side mirror of the theme, kept in refs so the render loop can read it
  // without re-rendering the tree.
  const themeTarget = useRef(0);
  const themeProgress = useRef(0);
  const themeSynced = useRef(false);
  const touchY = useRef<number | null>(null);
  const reduced = useRef(false);
  // Both of these live outside React (a media query and an attribute the head
  // bootstrap writes before hydration), so they are read through
  // useSyncExternalStore: the first client render matches the server snapshot,
  // and later changes arrive through a real subscription.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const theme = useSyncExternalStore(subscribeDocumentTheme, themeFromDocument, getServerThemeSnapshot);
  const [activeChapter, setActiveChapter] = useState<string>(() => chapterFor(0));
  const [dataStage, setDataStage] = useState(0);
  const enabledSources = useMemo<ExperienceSource[]>(() => {
    if (dataStage >= 2) return ["steam", "playstation", "discord"];
    if (dataStage >= 1) return ["steam", "playstation"];
    return [];
  }, [dataStage]);
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

    return {
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
  const applyTheme = useCallback((next: ThemeName, persist = true) => {
    themeTarget.current = next === "dark" ? 1 : 0;
    document.documentElement.dataset.theme = next;
    if (persist) window.localStorage.setItem("ankuzo-theme", next);
  }, []);
  const activateDataStage = useCallback((stage: number) => {
    setDataStage((current) => Math.max(current, stage));
  }, []);

  // Mirror the theme the head bootstrap picked into the scene driver. On the
  // very first pass the progress jumps instead of easing, so a dark reload does
  // not flash through the light palette.
  useEffect(() => {
    themeTarget.current = theme === "dark" ? 1 : 0;
    if (themeSynced.current) return;
    themeSynced.current = true;
    themeProgress.current = themeTarget.current;
  }, [theme]);

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
    return { inert: hidden, "aria-hidden": hidden || undefined };
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
            themeTarget={themeTarget} themeProgress={themeProgress}
            onDataStage={activateDataStage} onChapterChange={setActiveChapter}
            immediate={Boolean(reviewState) || reducedMotion} />
        </Canvas>

        <header className="experience-header">
          <button type="button" className="wordmark" onClick={() => setProgress(0)}>ANKUZO</button>
          <p id="experience-title" className="sr-only">CONTINUOUS SESSION / 22</p>
          <div className="header-tools">
            <button type="button" className="theme-switch" onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} aria-pressed={theme === "dark"}>
              <i aria-hidden="true" /><span className="sr-only">THEME / {theme.toUpperCase()}</span>
            </button>
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
          <ol className="data-list">
            {figures.topGames.map((game) => (
              <li key={game.id}>
                <span className="data-name">{game.title}</span>
                <span className="data-bar" aria-hidden="true">
                  <i style={{ transform: `scaleX(${game.hours / figures.topPeak})` }} />
                </span>
                <span className="data-value">{game.hours.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="chapter-copy chapter-copy--playstation" {...chapterState("playstation")}>
          <p className="chapter-eyebrow">PLAYSTATION</p>
          <h2 className="chapter-figure">
            <span className="figure-count" style={{ "--figure-target": figures.trophies } as CSSProperties}
              aria-label={`${figures.trophies} trophies`} />
            <span className="figure-unit">TROPHIES</span>
          </h2>
          <p className="chapter-note">{figures.playstationNote}</p>
          <ol className="data-list data-list--tiers">
            {figures.tiers.map((tier) => (
              <li key={tier.id} data-tier={tier.id} data-empty={tier.value === 0 ? "true" : undefined}>
                <span className="data-name">{tier.label}</span>
                <span className="data-bar" aria-hidden="true">
                  <i style={{ transform: `scaleX(${tier.value / figures.tierPeak})` }} />
                </span>
                <span className="data-value">{tier.value}</span>
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
          <div className="profile-card">
            {figures.discord.avatar ? (
              /* A 52px avatar inside a lazily mounted chapter is never the LCP
                 element, and the `next` package is not actually installed here
                 (vinext ships shims), so next/image would add risk for no gain. */
              // eslint-disable-next-line @next/next/no-img-element
              <img className="profile-avatar" src={figures.discord.avatar} alt="" width={52} height={52} loading="lazy" />
            ) : null}
            <div className="profile-identity">
              <strong>{figures.discord.displayName ?? figures.discord.username ?? "ANKUZO"}</strong>
              {figures.discord.username ? <span>@{figures.discord.username}</span> : null}
            </div>
          </div>
          {figures.activity ? (
            <p className="chapter-note chapter-note--activity">
              {figures.activity}{figures.activityDetail ? ` · ${figures.activityDetail}` : ""}
            </p>
          ) : null}
          {figures.discord.badges.length > 0 ? (
            <ul className="badge-row">
              {figures.discord.badges.map((badge) => (
                <li key={badge}>{badge.replace(/_/g, " ")}</li>
              ))}
            </ul>
          ) : null}
          <p className="chapter-note">TEAMSPEAK · SAME MACHINE AS THIS PAGE</p>
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
              <button type="button" className={theme === "light" ? "active" : ""}
                onClick={() => applyTheme("light")}>light</button>
              <button type="button" className={theme === "dark" ? "active" : ""}
                onClick={() => applyTheme("dark")}>dark</button>
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
