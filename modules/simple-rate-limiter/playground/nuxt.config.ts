export default defineNuxtConfig({
  compatibilityDate: "2026-08-08",
  modules: ["@nuxt/ui", "@onderwijsin/nuxt-simple-rate-limiter"],
  css: ["~/assets/main.css"],
  simpleRateLimiter: {
    global: {
      enabled: true,
      pruning: {
        enabled: true,
        cron: "*/10 * * * * *",
        staleAfter: 5
      }
    }
  }
});
