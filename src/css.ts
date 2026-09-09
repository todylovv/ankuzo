import type { CSSProperties } from "react";

const cache = new Map<string, CSSProperties>();

export function css(value: string): CSSProperties {
  const hit = cache.get(value);
  if (hit) return hit;

  const out: Record<string, string> = {};
  for (const part of value.split(";")) {
    const split = part.indexOf(":");
    if (split === -1) continue;
    const raw = part.slice(0, split).trim();
    const val = part.slice(split + 1).trim();
    if (!raw) continue;
    const key = raw.startsWith("--")
      ? raw
      : raw.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    out[key] = val;
  }

  cache.set(value, out);
  return out;
}
