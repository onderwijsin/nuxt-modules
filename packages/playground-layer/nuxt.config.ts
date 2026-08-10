import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2026-08-07",
  modules: ["@nuxt/ui"],
  css: [join(currentDir, "./app/assets/playground.css")]
});
