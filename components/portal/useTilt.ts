"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Pointer-driven tilt, written straight to CSS custom properties.
 *
 * Deliberately not React state: a mouse move would otherwise re-render whatever
 * chapter the element lives in, on every frame, for an effect that is purely
 * presentational. The rAF guard collapses the burst of pointer events a fast
 * cursor produces into one write per frame.
 */
export function useTilt<T extends HTMLElement>(maxTilt = 12) {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);

  const write = useCallback((x: number, y: number, lit: number) => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
    node.style.setProperty("--sheen", lit.toFixed(3));
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      // X is inverted so pushing the pointer up tips the top away, the way a
      // real object hinged at its centre would move.
      write(-py * maxTilt, px * maxTilt, (px + 1) / 2);
    });
  }, [maxTilt, write]);

  const onPointerLeave = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    write(0, 0, 0.5);
  }, [write]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
