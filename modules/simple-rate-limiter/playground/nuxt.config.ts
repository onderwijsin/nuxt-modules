export default defineNuxtConfig({
  compatibilityDate: "2026-08-08",
  modules: ["@nuxt/ui", "@onderwijsin/nuxt-simple-rate-limiter"],
  css: ["~/assets/main.css"],
  simpleRateLimiter: {
    global: {
      enabled: true,
      pruning: {
        enabled: true,
        staleAfter: 5
      }
    }
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      "*/10 * * * * *": ["simple-rate-limiter:prune"]
    }
  }
});
