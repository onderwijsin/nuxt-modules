import redirectsModule from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-10",
  modules: [redirectsModule],
  redirects: {
    serverMiddleware: true,
    store: false,
    routeMiddleware: false,
    cache: {
      index: { maxAge: 0, staleMaxAge: 0, swr: false },
      lookup: { maxAge: 0, staleMaxAge: 0, swr: false }
    }
  },
  nitro: { experimental: { tasks: true } }
});
