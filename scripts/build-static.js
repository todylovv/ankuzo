import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const projectRoot = new URL("../", import.meta.url);
const staticEntries = ["index.html", "robots.txt", "sitemap.xml", "assets", "css", "data", "fonts", "js"];
const unusedEntries = [
  "assets/discord-avatar-decoration.png",
  "fonts/bebas-neue-latin.woff2",
  "fonts/prata-cyrillic.woff2",
  "fonts/prata-latin.woff2",
  "fonts/unbounded-cyrillic.woff2",
  "fonts/unbounded-latin.woff2"
];

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of staticEntries) {
  await cp(new URL(entry, projectRoot), new URL(entry, outputDirectory), {
    recursive: true,
  });
}

for (const entry of unusedEntries) {
  await rm(new URL(entry, outputDirectory), { force: true });
}

console.log(`Built ${staticEntries.length} entries into dist/ and removed ${unusedEntries.length} unused assets`);
