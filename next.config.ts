import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is served from our own VPS behind nginx, not from a Worker, so we
  // want the self-contained Node build: `node dist/standalone/server.js`.
  output: "standalone",
};

export default nextConfig;
