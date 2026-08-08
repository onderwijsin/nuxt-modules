export default defineNuxtConfig({
  compatibilityDate: "2026-08-08",
  css: ["~/assets/main.css"],
  modules: ["@nuxt/ui", "@onderwijsin/nuxt-storage-admin"],
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
