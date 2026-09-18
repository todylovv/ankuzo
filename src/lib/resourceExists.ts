const cache = new Map<string, Promise<boolean>>();

export function resourceExists(path: string): Promise<boolean> {
  const hit = cache.get(path);
  if (hit) return hit;

  const request = fetch(path, { method: "HEAD" })
    .then((res) => res.ok)
    .catch(() => false);

  cache.set(path, request);
  return request;
}
