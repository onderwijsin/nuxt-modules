import redirectsModule from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-10",
  modules: [redirectsModule],
  redirects: {
    serverMiddleware: true,
    store: false,
    routeMiddleware: false
  },
  nitro: { experimental: { tasks: true } }
});
