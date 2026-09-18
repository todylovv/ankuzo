import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(rootDir, "public");

function existsInPublic(rel: string): boolean {
  return fs.existsSync(path.join(publicDir, rel));
}

function optionalAssetsPlugin(): Plugin {
  const virtualId = "virtual:optional-assets";

  const loadSource = () => {
    const games = ["cs2", "apex", "arena-breakout", "valorant", "helldivers-2"];
    const payload = {
      heroSky: existsInPublic("images/hero-sky.webp") || existsInPublic("images/hero-sky.jpg"),
      ankuzo: existsInPublic("models/ankuzo.glb"),
      twentyTwo: existsInPublic("models/22.glb"),
      portrait: existsInPublic("images/portrait.webp"),
      playground: existsInPublic("images/playground.webp"),
      games: Object.fromEntries(games.map((id) => [id, existsInPublic(`images/games/${id}.webp`)])),
    };

    return `export const optionalAssets = ${JSON.stringify(payload, null, 2)};`;
  };

  return {
    name: "optional-assets",
    resolveId(id) {
      if (id === virtualId) return id;
      return undefined;
    },
    load(id) {
      if (id === virtualId) return loadSource();
      return undefined;
    },
    configureServer(server) {
      const watchPaths = [
        path.join(publicDir, "images"),
        path.join(publicDir, "models"),
      ];
      for (const watchPath of watchPaths) {
        if (fs.existsSync(watchPath)) server.watcher.add(watchPath);
      }
    },
    handleHotUpdate({ file, server }) {
      if (!file.replaceAll("\\", "/").includes("/public/")) return;
      const mod = server.moduleGraph.getModuleById(virtualId);
      if (mod) void server.reloadModule(mod);
    },
  };
}

export default defineConfig({
  plugins: [react(), optionalAssetsPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
