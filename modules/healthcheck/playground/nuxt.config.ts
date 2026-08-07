export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-healthcheck"],
  healthcheck: {
    directus: {
      enabled: true,
      baseUrl: "https://sandbox.directus.com"
    }
  }
});
