export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  newsletterSignup: {
    enabled: true,
    provider: "loops",
    apiKey: "dummy-loops-key",
    lists: { default: "dummy-list" }
  }
});
