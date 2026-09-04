import { readFileSync } from "node:fs";

const profile = JSON.parse(
  readFileSync(new URL("./consumer-profile.json", import.meta.url), "utf8")
);

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  nitro: {
    storage: {
      externalRedirects: { driver: "memory" },
      "directus-assets": { driver: "memory" }
    },
    experimental: { tasks: true }
  },
  extends: profile.layers.map((layer: string) => `./consumer-layers/${layer}`)
});
