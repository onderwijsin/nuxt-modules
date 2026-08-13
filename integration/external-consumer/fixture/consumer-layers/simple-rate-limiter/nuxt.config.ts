export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-simple-rate-limiter"],
  simpleRateLimiter: { global: { enabled: false } }
});
