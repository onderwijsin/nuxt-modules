export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-redirects"],
  redirects: {
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    storeRefreshInterval: 5
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      // Refresh every 10 seconds
      "*/10 * * * * *": ["redirects:refresh"]
    }
  }
});
