export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-healthcheck"],
  healthcheck: {
    enabled: true,
    cloudinary: {
      enabled: false,
      cloudName: "dummy-cloud",
      apiKey: "dummy-key",
      apiSecret: "dummy-secret"
    },
    directus: { enabled: false, baseUrl: "https://dummy.invalid" }
  }
});
