import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  css: ["~/assets/main.css"],
  modules: ["@onderwijsin/nuxt-storage-admin"],
  appConfig: { packageName },
  storageAdmin: {
    enabled: true,
    adminToken: "playground-admin-token",
    devAuthBypass: true,
    mounts: {
      cache: {
        permissions: ["read", "write", "delete"],
        prefixes: ["pages", "kennisbank:articles", "media:videos"]
      },
      demo: {
        permissions: ["read", "write", "delete"],
        prefixes: ["drafts", "events"]
      }
    }
  }
});
