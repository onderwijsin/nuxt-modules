export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-storage-admin"],
  storageAdmin: {
    enabled: true,
    adminToken: "dummy-storage-token",
    mounts: { cache: { permissions: ["read"], allowRoot: true } },
    ui: { enabled: false }
  }
});
