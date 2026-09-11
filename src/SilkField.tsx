import { useEffect, useRef } from "react";
import { css } from "./css";

const STRANDS = 160;
const SCALE = 0.00118;
const SPEED = 2.15;
const SWIRL = 0.14;
const TAIL = 14;
const MAX_EDDIES = 2;

type Strand = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: number[];
  life: number;
  max: number;
  width: number;
  warm: boolean;
};

type Eddy = {
  x: number;
  y: number;
  spin: number;
  radius: number;
  born: number;
  life: number;
};

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makeNoise(seed: number): (x: number, y: number, z: number) => number {
  const perm = new Uint8Array(512);
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) source[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i -= 1) {
    s = (s * 16807 + 11) >>> 0;
    const j = s % (i + 1);
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  for (let i = 0; i < 256; i += 1) {
    perm[i] = source[i];
    perm[i + 256] = source[i];
  }

  function grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    let v = z;
    if (h < 4) v = y;
    else if (h === 12 || h === 14) v = x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    const x1 = mix(grad(perm[AA], xf, yf, zf), grad(perm[BA], xf - 1, yf, zf), u);
    const x2 = mix(grad(perm[AB], xf, yf - 1, zf), grad(perm[BB], xf - 1, yf - 1, zf), u);
    const y1 = mix(x1, x2, v);
    const x3 = mix(grad(perm[AA + 1], xf, yf, zf - 1), grad(perm[BA + 1], xf - 1, yf, zf - 1), u);
    const x4 = mix(grad(perm[AB + 1], xf, yf - 1, zf - 1), grad(perm[BB + 1], xf - 1, yf - 1, zf - 1), u);
    return mix(y1, mix(x3, x4, v), w);
  };
}

function strokeColor(light: number, warm: boolean): string {
  const t = Math.min(1, Math.max(0, light));
  const r = mix(warm ? 232 : 246, warm ? 72 : 11, t);
  const g = mix(warm ? 214 : 245, warm ? 58 : 11, t);
  const b = mix(warm ? 170 : 243, warm ? 32 : 11, t);
  const a = mix(0.28, 0.2, t);
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function SilkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;
    const view = canvas;
    const draw = ctx;
    const noise = makeNoise((Math.random() * 10000) | 0);
    const root = view.closest("[data-archive]") as HTMLElement | null;
    const eddies: Eddy[] = [];
    let nextEddy = 1.6;
    let running = true;
    let pageVisible = document.visibilityState === "visible";
    let raf = 0;
    let width = 0;
    let height = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let aimX = 0.5;
    let aimY = 0.5;
    let hasMouse = false;
    let time = 0;
    let last = 0;
    const strands: Strand[] = [];

    function live(): boolean {
      return pageVisible && !reduced;
    }

    function spawn(inside = false): Strand {
      let x = Math.random() * width;
      let y = Math.random() * height;
      if (!inside) {
        const edge = Math.random();
        if (edge < 0.25) x = -20;
        else if (edge < 0.5) x = width + 20;
        else if (edge < 0.75) y = -20;
        else y = height + 20;
      }
      return {
        x,
        y,
        vx: 0,
        vy: 0,
        trail: [x, y],
        life: 0,
        max: 286 + Math.random() * 416,
        width: Math.random() < 0.22 ? 1.55 : 0.95,
        warm: Math.random() < 0.1,
      };
    }

    function resize(): void {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      view.width = Math.max(1, Math.floor(width * dpr));
      view.height = Math.max(1, Math.floor(height * dpr));
      view.style.width = `${width}px`;
      view.style.height = `${height}px`;
      draw.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw.lineCap = "round";
      draw.lineJoin = "round";
      strands.length = 0;
      for (let i = 0; i < STRANDS; i += 1) strands.push(spawn(true));
    }

    function curlAt(x: number, y: number, z: number, scale: number): { x: number; y: number } {
      const e = 0.55;
      const nx = x * scale;
      const ny = y * scale;
      const n1 = noise(nx, ny + e, z);
      const n2 = noise(nx, ny - e, z);
      const n3 = noise(nx + e, ny, z);
      const n4 = noise(nx - e, ny, z);
      return { x: (n1 - n2) / (2 * e), y: -(n3 - n4) / (2 * e) };
    }

    function tendEddies(t: number): void {
      for (let i = eddies.length - 1; i >= 0; i -= 1) {
        const eddy = eddies[i];
        eddy.x += Math.sin(t * 0.13 + eddy.spin) * 0.12;
        eddy.y += Math.cos(t * 0.11 + eddy.radius) * 0.09;
        if ((t - eddy.born) / eddy.life >= 1) eddies.splice(i, 1);
      }
      if (eddies.length < MAX_EDDIES && t >= nextEddy) {
        const left = Math.random() < 0.5;
        eddies.push({
          x: width * (left ? 0.14 + Math.random() * 0.28 : 0.58 + Math.random() * 0.28),
          y: height * (0.2 + Math.random() * 0.6),
          spin: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.55),
          radius: 140 + Math.random() * 160,
          born: t,
          life: 9 + Math.random() * 8,
        });
        nextEddy = t + 6 + Math.random() * 7;
      }
    }

    function eddyForce(x: number, y: number, t: number): { x: number; y: number } {
      let vx = 0;
      let vy = 0;
      for (const eddy of eddies) {
        const age = Math.min(1, Math.max(0, (t - eddy.born) / eddy.life));
        const envelope = fade(Math.sin(age * Math.PI));
        const dx = x - eddy.x;
        const dy = y - eddy.y;
        const dist = Math.hypot(dx, dy) + 1;
        const pull = eddy.radius / (dist + eddy.radius * 0.55);
        const speed = eddy.spin * envelope * pull * 2.6;
        vx += (-dy / dist) * speed;
        vy += (dx / dist) * speed;
      }
      return { x: vx, y: vy };
    }

    function light(): number {
      const raw = root?.style.getPropertyValue("--silk-light") || "0";
      return Math.min(1, Math.max(0, Number(raw) || 0));
    }

    function drawTrail(pts: number[]): void {
      const n = pts.length;
      if (n < 4) return;
      const start = Math.max(0, n - TAIL);
      draw.beginPath();
      draw.moveTo(pts[start], pts[start + 1]);
      if (n - start === 4) {
        draw.lineTo(pts[start + 2], pts[start + 3]);
      } else {
        for (let i = start + 2; i < n - 2; i += 2) {
          const mx = (pts[i] + pts[i + 2]) * 0.5;
          const my = (pts[i + 1] + pts[i + 3]) * 0.5;
          draw.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
        }
        draw.lineTo(pts[n - 2], pts[n - 1]);
      }
      draw.stroke();
    }

    function step(t: number, dt: number): void {
      draw.globalCompositeOperation = "destination-out";
      draw.fillStyle = "rgba(0,0,0,0.026)";
      draw.fillRect(0, 0, width, height);
      draw.globalCompositeOperation = "source-over";
      tendEddies(t);
      const tone = light();
      const cool = strokeColor(tone, false);
      const warmInk = strokeColor(tone, true);
      mouseX += (aimX - mouseX) * (1 - Math.exp(-dt * 5));
      mouseY += (aimY - mouseY) * (1 - Math.exp(-dt * 5));
      const mx = mouseX * width;
      const my = mouseY * height;
      const ease = 1 - Math.exp(-dt * 3.2);
      const stepScale = dt * 60;

      for (const strand of strands) {
        const field = curlAt(strand.x, strand.y, t * 0.022, SCALE);
        const eddy = eddies.length ? eddyForce(strand.x, strand.y, t) : { x: 0, y: 0 };
        let ax = field.x * SPEED + eddy.x;
        let ay = field.y * SPEED + eddy.y;

        if (hasMouse) {
          const dx = strand.x - mx;
          const dy = strand.y - my;
          const dist = Math.hypot(dx, dy) + 28;
          const force = (SWIRL * 420) / (dist * dist);
          ax += -dy * force;
          ay += dx * force;
        }

        strand.vx += (ax - strand.vx) * ease;
        strand.vy += (ay - strand.vy) * ease;
        const mag = Math.hypot(strand.vx, strand.vy);
        if (mag > 2.6) {
          strand.vx *= 2.6 / mag;
          strand.vy *= 2.6 / mag;
        }

        strand.x += strand.vx * stepScale;
        strand.y += strand.vy * stepScale;
        strand.life += 1;
        strand.trail.push(strand.x, strand.y);
        if (strand.trail.length > TAIL * 2) strand.trail.splice(0, 2);

        const out =
          strand.x < -50 ||
          strand.x > width + 50 ||
          strand.y < -50 ||
          strand.y > height + 50 ||
          strand.life > strand.max;
        if (out) {
          Object.assign(strand, spawn());
          continue;
        }

        draw.strokeStyle = strand.warm ? warmInk : cool;
        draw.lineWidth = strand.width;
        drawTrail(strand.trail);
      }
    }

    function frame(now: number): void {
      if (!running) return;
      if (live()) {
        const dt = last ? Math.min(0.033, (now - last) / 1000) : 0.016;
        last = now;
        time += dt;
        step(time, dt);
        raf = window.requestAnimationFrame(frame);
      }
    }

    function kick(): void {
      window.cancelAnimationFrame(raf);
      last = 0;
      if (live()) raf = window.requestAnimationFrame(frame);
    }

    resize();

    const onMove = (event: PointerEvent) => {
      hasMouse = true;
      aimX = event.clientX / Math.max(1, window.innerWidth);
      aimY = event.clientY / Math.max(1, window.innerHeight);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });

    const onVis = () => {
      pageVisible = document.visibilityState === "visible";
      kick();
    };
    document.addEventListener("visibilitychange", onVis);
    raf = window.requestAnimationFrame(kick);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={css(`position:fixed;inset:0;z-index:1;width:100%;height:100%;pointer-events:none`)}
    />
  );
}
