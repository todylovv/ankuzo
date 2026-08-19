"use client";
/* eslint-disable react/no-unknown-property, react-hooks/immutability -- R3F uses Three.js objects imperatively. */

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
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
import { ExperienceSignals } from "./ExperienceSignals";
import { PortalTwentyTwo } from "./FracturedTwo";
import { GothicEnvironment } from "./GothicEnvironment";
import { DARK_PALETTE, LIGHT_PALETTE, mixColor, mixNumber } from "./theme";
import type { ThemeName } from "./theme";
import { useExperienceData } from "../data/useExperienceData";
import type { ExperienceSource, GameIdentity } from "../../lib/experience-data";

const PORTAL_END = 0.22;

const CHAPTERS = [
  { id: "portal", label: "22", index: "00", progress: 0 },
  { id: "library", label: "LIBRARY", index: "01", progress: 0.24 },
  { id: "platforms", label: "PLATFORMS", index: "02", progress: 0.46 },
  { id: "online", label: "ONLINE", index: "03", progress: 0.63 },
  { id: "build", label: "BUILD", index: "04", progress: 0.79 },
  { id: "final", label: "22 / END", index: "05", progress: 1 },
] as const;

const REVIEW_STATES = [
  { scene: "portal", frame: "pristine", progress: 0 },
  { scene: "portal", frame: "stress", progress: 0.066 },
  { scene: "portal", frame: "cracks", progress: 0.105 },
  { scene: "portal", frame: "fracture", progress: 0.132 },
  { scene: "portal", frame: "breakthrough", progress: 0.18 },
  { scene: "library", frame: "arrival", progress: 0.235 },
  { scene: "library", frame: "active", progress: 0.35 },
  { scene: "platforms", frame: "split", progress: 0.49 },
  { scene: "platforms", frame: "merge", progress: 0.575 },
  { scene: "online", frame: "active", progress: 0.67 },
  { scene: "build", frame: "active", progress: 0.83 },
  { scene: "final", frame: "22", progress: 1 },
] as const;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

function chapterFor(progress: number) {
  if (progress < 0.225) return "portal";
  if (progress < 0.43) return "library";
  if (progress < 0.6) return "platforms";
  if (progress < 0.76) return "online";
  if (progress < 0.91) return "build";
  return "final";
}

function remapPortalTravel(progress: number) {
  const knots: Array<[number, number]> = [
    [0, 0], [0.25, 0.1], [0.4, 0.2], [0.55, 0.34],
    [0.7, 0.51], [0.88, 0.78], [1, 1],
  ];
  for (let index = 1; index < knots.length; index += 1) {
    const [endProgress, endTravel] = knots[index];
    if (progress <= endProgress) {
      const [startProgress, startTravel] = knots[index - 1];
      const local = smoothstep(0, 1, (progress - startProgress) / (endProgress - startProgress));
      return startTravel + (endTravel - startTravel) * local;
    }
  }
  return 1;
}

function themeFromDocument(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
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

function ProgressDriver({ target, rendered, portal, immediate, onDataStage }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  immediate: boolean;
  onDataStage: (stage: number) => void;
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
    }
    document.documentElement.style.setProperty("--experience-progress", rendered.current.toFixed(4));
    document.documentElement.style.setProperty("--portal-progress", portal.current.toFixed(4));
    const dataStage = rendered.current >= 0.58 ? 2 : rendered.current >= 0.18 ? 1 : 0;
    if (dataStage > lastDataStage.current) {
      lastDataStage.current = dataStage;
      onDataStage(dataStage);
    }
  });
  return null;
}

function CameraRig({ portal, master, pointer }: {
  portal: MutableRefObject<number>;
  master: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
}) {
  const { camera, size } = useThree();
  const portrait = size.width / size.height < 0.78;
  const current = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const portalCurve = useMemo(() => new CatmullRomCurve3(
    portrait
      ? [
          new Vector3(0.04, 0.12, 14.2), new Vector3(-0.03, 0.1, 10.8),
          new Vector3(0.07, 0.05, 6.4), new Vector3(0.03, 0.01, 2.6),
          new Vector3(0, -0.02, -0.55), new Vector3(-0.03, -0.04, -4.3),
          new Vector3(0.06, -0.02, -8.6),
        ]
      : [
          new Vector3(0.12, 0.12, 13.5), new Vector3(0.07, 0.1, 9.7),
          new Vector3(0.14, 0.05, 5.6), new Vector3(0.04, 0.01, 2.2),
          new Vector3(0, -0.01, -0.55), new Vector3(-0.04, -0.03, -4.2),
          new Vector3(0.08, -0.01, -8.7),
        ],
    false, "centripetal", 0.25,
  ), [portrait]);

  useFrame(() => {
    const masterValue = master.current;
    if (masterValue <= PORTAL_END) {
      const travel = Math.min(0.999, remapPortalTravel(portal.current));
      portalCurve.getPointAt(travel, current);
      portalCurve.getPointAt(Math.min(0.999, travel + 0.032), look);
      const pointerFade = 1 - smoothstep(0.04, 0.1, masterValue);
      current.x += pointer.current.x * 0.075 * pointerFade;
      current.y += pointer.current.y * 0.05 * pointerFade;
      look.x += pointer.current.x * 0.035 * pointerFade;
      look.y += pointer.current.y * 0.022 * pointerFade;
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

function ExperienceScene({ target, rendered, portal, pointer, themeTarget, themeProgress, games, immediate, onDataStage }: {
  target: MutableRefObject<number>;
  rendered: MutableRefObject<number>;
  portal: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
  themeTarget: MutableRefObject<number>;
  themeProgress: MutableRefObject<number>;
  games: GameIdentity[];
  immediate: boolean;
  onDataStage: (stage: number) => void;
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
      <GothicEnvironment themeProgress={themeProgress} pointer={pointer} />
      <ContinuousWorld progress={rendered} themeProgress={themeProgress} games={games} />
      <PortalTwentyTwo progress={portal} masterProgress={rendered} themeProgress={themeProgress} />
      <CameraRig portal={portal} master={rendered} pointer={pointer} />
      <ProgressDriver target={target} rendered={rendered} portal={portal} immediate={immediate} onDataStage={onDataStage} />
    </>
  );
}

export function PortalExperience() {
  const stage = useRef<HTMLElement>(null);
  const targetProgress = useRef(0);
  const renderedProgress = useRef(0);
  const portalProgress = useRef(0);
  const initialTheme = themeFromDocument();
  const themeTarget = useRef(initialTheme === "dark" ? 1 : 0);
  const themeProgress = useRef(initialTheme === "dark" ? 1 : 0);
  const pointer = useRef({ x: 0, y: 0 });
  const touchY = useRef<number | null>(null);
  const reduced = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [dataStage, setDataStage] = useState(0);
  const enabledSources = useMemo<ExperienceSource[]>(() => {
    if (dataStage >= 2) return ["steam", "playstation", "discord"];
    if (dataStage >= 1) return ["steam", "playstation"];
    return [];
  }, [dataStage]);
  const { data: experienceData } = useExperienceData({ enabledSources });
  const searchParams = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const queryScene = searchParams?.get("scene") ?? null;
  const queryFrame = searchParams?.get("frame") ?? null;
  const reviewMode = searchParams?.get("review") === "1";
  const reviewDevice = searchParams?.get("device") === "mobile" ? "mobile" : "desktop";
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

  const applyTheme = useCallback((next: ThemeName, persist = true) => {
    setTheme(next);
    themeTarget.current = next === "dark" ? 1 : 0;
    document.documentElement.dataset.theme = next;
    if (persist) window.localStorage.setItem("ankuzo-theme", next);
  }, []);
  const activateDataStage = useCallback((stage: number) => {
    setDataStage((current) => Math.max(current, stage));
  }, []);

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

    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced.current);
    if (reduced.current) document.documentElement.dataset.experienceReduced = "true";
    setProgress(0, true);

    const wheelPixels = (event: WheelEvent) => {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 18;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
      return event.deltaY;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = wheelPixels(event);
      const speed = reduced.current ? 0.0005 : 0.000145;
      setProgress(targetProgress.current + delta * speed, reduced.current);
    };
    const onTouchStart = (event: TouchEvent) => { touchY.current = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const nextY = event.touches[0]?.clientY;
      if (touchY.current === null || nextY === undefined) return;
      event.preventDefault();
      const delta = touchY.current - nextY;
      touchY.current = nextY;
      setProgress(targetProgress.current + delta * (reduced.current ? 0.002 : 0.00052), reduced.current);
    };
    const onTouchEnd = () => { touchY.current = null; };
    const onPointerMove = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth * 2 - 1;
      pointer.current.y = -(event.clientY / window.innerHeight * 2 - 1);
    };
    const onKeyDown = (event: KeyboardEvent) => {
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      delete document.documentElement.dataset.experienceLocked;
      delete document.documentElement.dataset.experienceReduced;
      delete document.documentElement.dataset.chapter;
    };
  }, [reviewState, setProgress]);

  const skipPortal = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setProgress(0.24, true);
  };

  return (
    <main className={`experience-shell ${reviewDevice === "mobile" ? "review-mobile" : ""}`}>
      <a className="skip-link" href="#library" onClick={skipPortal}>Skip the portal</a>
      <section className="experience-stage" ref={stage} aria-labelledby="experience-title">
        <Canvas className="experience-canvas" dpr={[1, 1.35]}
          camera={{ position: [0, 0, 13.5], fov: 35, near: 0.035, far: 70 }}
          gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.02 }}>
          <ExperienceScene target={targetProgress} rendered={renderedProgress} portal={portalProgress}
            pointer={pointer} themeTarget={themeTarget} themeProgress={themeProgress}
            games={experienceData.games} onDataStage={activateDataStage}
            immediate={Boolean(reviewState) || reducedMotion} />
        </Canvas>

        <header className="experience-header">
          <button type="button" className="wordmark" onClick={() => setProgress(0)}>ANKUZO</button>
          <p id="experience-title">CONTINUOUS SESSION / 22</p>
          <div className="header-tools">
            <button type="button" className="theme-switch" onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} aria-pressed={theme === "dark"}>
              <i aria-hidden="true" /><span suppressHydrationWarning>THEME / {theme.toUpperCase()}</span>
            </button>
            <p className="experience-counter">00—05</p>
          </div>
        </header>

        <div className="chapter-copy chapter-copy--portal">
          <p>SILVER / SESSION 22</p><h1>22</h1><span>SCROLL TO ENTER</span>
        </div>
        <div className="chapter-copy chapter-copy--library" id="library">
          <p>ANKUZO LIBRARY / 001</p><h2>LIBRARY</h2><span>PC · CURRENT · ARCHIVE</span>
        </div>
        <div className="chapter-copy chapter-copy--platforms">
          <p>TWO ECOSYSTEMS / ONE IDENTITY</p><h2>PLATFORMS</h2>
          <div className="platform-labels"><span>PC / STEAM</span><span>PLAYSTATION</span></div>
        </div>
        <div className="chapter-copy chapter-copy--online">
          <p>PERSONAL NETWORK / SIGNAL</p><h2>ONLINE</h2>
        </div>
        <div className="chapter-copy chapter-copy--build">
          <p>BUILD / CURRENT</p><h2>BUILD</h2>
          <div className="build-traces"><span>components/portal/</span><span>ContinuousWorld.tsx</span><span>BUILD / PASSING</span></div>
        </div>
        <div className="chapter-copy chapter-copy--final">
          <p>22 / END</p><h2>ANKUZO</h2><span>IDENTITY RECONSTRUCTED</span>
        </div>

        <nav className="chapter-nav" aria-label="Experience chapters">
          {CHAPTERS.map((chapter) => (
            <button key={chapter.id} type="button" data-target-chapter={chapter.id}
              onClick={() => setProgress(chapter.progress, reducedMotion)}
              aria-label={`${chapter.index} ${chapter.label}`}>
              <i /><span>{chapter.index}</span><b>{chapter.label}</b>
            </button>
          ))}
        </nav>

        <div className="experience-meter" aria-hidden="true"><i><b /></i><span>SCENE PROGRESS</span></div>
        <ExperienceSignals data={experienceData} />

        {reviewMode && (
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
