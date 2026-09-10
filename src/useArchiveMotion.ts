import { useEffect, useRef, useState, type RefObject } from "react";

type Motion = "full" | "off";

type ArchiveMotionOptions = {
  motion?: Motion;
};

type ArchiveMotion = {
  tsLabel: string;
  copyTs: () => void;
};

function sceneProgress(rect: DOMRect, vh: number): number {
  const span = rect.height - vh;
  if (span > 40) return Math.min(1, Math.max(0, -rect.top / span));
  if (rect.top < vh * 0.4) return 1;
  return 0;
}

function writeVar(
  cache: WeakMap<HTMLElement, string>,
  el: HTMLElement,
  name: string,
  next: string,
): void {
  if (cache.get(el) === next) return;
  cache.set(el, next);
  el.style.setProperty(name, next);
}

function showPlate(plate: HTMLElement, on: boolean): void {
  plate.style.opacity = on ? "1" : "0";
  plate.style.visibility = on ? "visible" : "hidden";
}

export function useArchiveMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  options: ArchiveMotionOptions = {},
): ArchiveMotion {
  const motion = options.motion ?? "full";
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);

  useEffect(() => {
    const scope = rootRef.current ?? document;
    const scenes = Array.from(scope.querySelectorAll<HTMLElement>("[data-scene]"));
    const plates = Array.from(scope.querySelectorAll<HTMLElement>("[data-plate]"));
    let activeKey: string | undefined;
    let raf = 0;
    const lastP = new WeakMap<HTMLElement, string>();
    const lastB = new WeakMap<HTMLElement, string>();

    function setPlate(next: string | undefined): void {
      if (!next || next === activeKey) return;
      activeKey = next;
      for (const plate of plates) showPlate(plate, plate.dataset.plate === next);
    }

    function applyStatic(): IntersectionObserver | undefined {
      for (const el of scenes) {
        el.style.setProperty("--p", el.dataset.static || "0");
        el.style.setProperty("--b", "1");
        el.style.height = "auto";
        const sticky = el.querySelector<HTMLElement>("[data-sticky]");
        if (sticky) {
          sticky.style.position = "relative";
          sticky.style.minHeight = "100vh";
          sticky.style.height = "auto";
        }
        const track = el.querySelector<HTMLElement>("[data-track]");
        if (track) {
          track.style.position = "relative";
          track.style.width = "100%";
          track.style.flexWrap = "wrap";
          track.style.transform = "none";
          for (const child of track.children) {
            const node = child as HTMLElement;
            node.style.width = "100%";
            node.style.height = "86vh";
          }
        }
      }
      if (!("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver(
        (entries) => {
          let best: IntersectionObserverEntry | undefined;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
          }
          if (best) {
            const scene = best.target as HTMLElement;
            setPlate(scene.dataset.chapter);
            const light = scene.dataset.scene === "wipe" || scene.dataset.scene === "discord" ? "1" : "0";
            rootRef.current?.style.setProperty("--silk-light", light);
            rootRef.current?.style.setProperty("--wipe-b", scene.dataset.scene === "wipe" ? "1" : "0");
            rootRef.current?.style.setProperty("--discord-p", scene.dataset.scene === "discord" ? "1" : "0");
          }
        },
        { threshold: [0.15, 0.5, 0.85] },
      );
      for (const scene of scenes) observer.observe(scene);
      return observer;
    }

    const reduced =
      motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const observer = applyStatic();
      return () => observer?.disconnect();
    }

    const lastRoot = new Map<string, string>();
    const host = rootRef.current;

    function setRoot(name: string, value: string): void {
      if (!host || lastRoot.get(name) === value) return;
      lastRoot.set(name, value);
      host.style.setProperty(name, value);
    }

    function applyScene(el: HTMLElement, p: number): void {
      writeVar(lastP, el, "--p", p.toFixed(4));
      const name = el.dataset.scene;
      if (name === "wipe") {
        writeVar(lastB, el, "--b", (1 - Math.abs(2 * p - 1)).toFixed(3));
      }
    }

    function update(): void {
      const vh = innerHeight;
      let best = 0;
      let active: HTMLElement | null = null;
      let activeP = 0;
      let wipeB = 0;
      let discordP = 0;
      for (const el of scenes) {
        const r = el.getBoundingClientRect();
        const p = sceneProgress(r, vh);
        const on = r.bottom > 0 && r.top < vh;
        if (on) applyScene(el, p);
        if (on && el.dataset.scene === "wipe") wipeB = 1 - Math.abs(2 * p - 1);
        if (on && el.dataset.scene === "discord") discordP = p;
        const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (vis > best) {
          best = vis;
          active = el;
          activeP = p;
        }
      }
      const discordLight = Math.min(1, Math.max(0, (discordP - 0.16) / 0.38));
      setRoot("--wipe-b", wipeB.toFixed(3));
      setRoot("--discord-p", discordP.toFixed(4));
      setRoot("--silk-light", Math.max(wipeB, discordLight).toFixed(3));
      if (!active) return;
      if (active.dataset.scene === "recent") {
        setPlate("recent" + Math.min(4, Math.floor(activeP * 5 + 0.12)));
        return;
      }
      setPlate(active.dataset.chapter);
    }

    function onScroll(): void {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    }

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [motion, rootRef]);

  function copyTs(): void {
    function done(): void {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("https://tmspk.gg/3Vi7A7Y9").then(done, done);
      return;
    }
    done();
  }

  return {
    tsLabel: copied ? "ссылка скопирована" : "скопировать ссылку",
    copyTs,
  };
}
