import { fileURLToPath } from "node:url";
import cacheModule from "@onderwijsin/nuxt-cache";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-09",
  modules: [cacheModule],
  cache: {
    enabled: true,
    adminToken: "fixture-admin-token"
  },
  nitro: {
    storage: {
      cache: {
        driver: fileURLToPath(new URL("./server/storage/cache-driver.ts", import.meta.url))
      }
    }
  }
});
