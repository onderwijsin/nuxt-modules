import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineEventHandler } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";

export default defineEventHandler((event) => {
  const manifestPath = useRuntimeConfig(event).directusPrerenderManifestPath;

  return readFile(manifestPath || join(process.cwd(), ".nuxt", "prerender-routes.json"), "utf8")
    .then((manifest) => JSON.parse(manifest) as string[])
    .catch(() => []);
});
