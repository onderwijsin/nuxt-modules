import redirectsModule from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-10",
  modules: [redirectsModule],
  redirects: {
    serverMiddleware: true,
    store: false,
    routeMiddleware: false,
    storageMount: "externalRedirects"
  },
  nitro: {
    experimental: { tasks: true },
    storage: { externalRedirects: { driver: "memory" } }
  }
});
