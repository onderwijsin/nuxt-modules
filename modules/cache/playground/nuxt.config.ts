import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-09",
  modules: ["@nuxt/ui", "@onderwijsin/nuxt-cache"],
  css: ["~/assets/main.css"],
  cache: { enabled: true, devAuthBypass: true },
  nitro: {
    storage: {
      cache: {
        driver: fileURLToPath(new URL("./server/storage/cache-driver.mjs", import.meta.url))
      }
    },
    devStorage: {
      cache: {
        driver: fileURLToPath(new URL("./server/storage/cache-driver.mjs", import.meta.url))
      }
    }
  }
});
