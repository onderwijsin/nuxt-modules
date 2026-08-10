export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@nuxt/ui", "@onderwijsin/nuxt-redirects"],
  css: ["~/assets/main.css"],
  redirects: {
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    dynamicMatching: true,
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
