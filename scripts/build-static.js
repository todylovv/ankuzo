import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const projectRoot = new URL("../", import.meta.url);
const staticEntries = ["index.html", "assets", "css", "data", "fonts", "js"];

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of staticEntries) {
  await cp(new URL(entry, projectRoot), new URL(entry, outputDirectory), {
    recursive: true,
  });
}

console.log(`Built ${staticEntries.length} entries into dist/`);
