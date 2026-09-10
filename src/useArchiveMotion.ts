import { useEffect, useRef, useState, type RefObject } from "react";

type Motion = "full" | "off";

type ArchiveMotionOptions = {
  motion?: Motion;
  cursorDepth?: boolean;
  grain?: boolean;
  steamHours?: number;
};

function setCssVar(el: HTMLElement, name: string, next: string, prev: string | undefined): string {
  if (prev !== next) el.style.setProperty(name, next);
  return next;
}

function sceneProgress(rect: DOMRect, vh: number): number {
  const span = rect.height - vh;
  if (span > 40) return Math.min(1, Math.max(0, -rect.top / span));
  if (rect.top < vh * 0.4) return 1;
  return 0;
}

export function useArchiveMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  options: ArchiveMotionOptions = {},
) {
  const motion = options.motion ?? "full";
  const cursorDepth = options.cursorDepth ?? true;
  const grain = options.grain ?? true;
  const steamHours = options.steamHours ?? 0;
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number>(0);

  useEffect(() => {
    const root = document.documentElement;
    const scope = rootRef.current ?? document;
    const scenes = Array.from(scope.querySelectorAll<HTMLElement>("[data-scene]"));
    const plates = Array.from(scope.querySelectorAll<HTMLElement>("[data-plate]"));
    const counter = scope.querySelector<HTMLElement>("[data-count]");
    let key: string | undefined;
    let raf = 0;
    let io: IntersectionObserver | undefined;
    let dirty = true;
    let lastY: number | undefined;
    let velocity = 0;
    let countValue: number | undefined;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const depth = cursorDepth && window.matchMedia("(hover: hover)").matches;

    if (grain) {
      const g = scope.querySelector<HTMLElement>("[data-grain]");
      if (g) {
        const svg =
          "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>";
        g.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
      }
    }

    const setPlate = (next: string | undefined) => {
      if (!next || next === key) return;
      key = next;
      plates.forEach((plate) => {
        plate.style.opacity = plate.dataset.plate === next ? "1" : "0";
      });
    };

    const applyStatic = () => {
      scenes.forEach((el) => {
        const s = el.dataset.static || "0";
        el.style.setProperty("--p", s);
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
          Array.from(track.children).forEach((child) => {
            const node = child as HTMLElement;
            node.style.width = "100%";
            node.style.height = "86vh";
          });
        }
      });
      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver(
          (entries) => {
            const vis = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (vis) setPlate((vis.target as HTMLElement).dataset.chapter);
          },
          { threshold: [0.15, 0.5, 0.85] },
        );
        scenes.forEach((scene) => io?.observe(scene));
      }
    };

    const reduced =
      motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      applyStatic();
      return () => io?.disconnect();
    }

    const lastP = new WeakMap<HTMLElement, string>();
    const lastB = new WeakMap<HTMLElement, string>();

    const update = () => {
      const vh = innerHeight;
      let best = 0;
      let active: HTMLElement | null = null;
      let activeP = 0;
      for (const el of scenes) {
        const r = el.getBoundingClientRect();
        const p = sceneProgress(r, vh);
        if (r.bottom > 0 && r.top < vh) {
          lastP.set(el, setCssVar(el, "--p", p.toFixed(4), lastP.get(el)));
          const name = el.dataset.scene;
          if (name === "wipe") {
            lastB.set(el, setCssVar(el, "--b", (1 - Math.abs(2 * p - 1)).toFixed(3), lastB.get(el)));
          }
          if (name === "steam" && counter) {
            const t = Math.min(1, p / 0.45);
            const count = Math.round((1 - Math.pow(1 - t, 3)) * steamHours);
            if (count !== countValue) {
              countValue = count;
              counter.textContent = String(count);
            }
          }
        }
        const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (vis > best) {
          best = vis;
          active = el;
          activeP = p;
        }
      }
      if (!active) return;
      let next = active.dataset.chapter;
      if (active.dataset.scene === "recent") next = "recent" + Math.min(4, Math.floor(activeP * 5 + 0.12));
      setPlate(next);
    };

    const onScroll = () => {
      dirty = true;
    };
    const onMove = (event: PointerEvent) => {
      mouse.tx = event.clientX / innerWidth - 0.5;
      mouse.ty = event.clientY / innerHeight - 0.5;
    };

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    if (depth) addEventListener("pointermove", onMove, { passive: true });

    let lastMx = "";
    let lastMy = "";
    let lastV = "";

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (depth) {
        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;
        lastMx = setCssVar(root, "--mx", mouse.x.toFixed(4), lastMx);
        lastMy = setCssVar(root, "--my", mouse.y.toFixed(4), lastMy);
      }
      const y = scrollY;
      const raw = Math.min(1, Math.abs(y - (lastY ?? y)) / 90);
      lastY = y;
      velocity += (raw - velocity) * (raw > velocity ? 0.35 : 0.07);
      lastV = setCssVar(root, "--v", velocity.toFixed(3), lastV);
      if (!dirty) return;
      dirty = false;
      update();
    };
    dirty = true;
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      removeEventListener("pointermove", onMove);
      io?.disconnect();
    };
  }, [motion, cursorDepth, grain, rootRef, steamHours]);

  const copyTs = () => {
    const done = () => {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("https://tmspk.gg/3Vi7A7Y9").then(done, done);
    } else done();
  };

  return {
    tsLabel: copied ? "ссылка скопирована" : "скопировать ссылку",
    copyTs,
  };
}
