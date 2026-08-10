import { fileURLToPath } from "node:url";
import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-cache"],
  appConfig: { packageName },
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
