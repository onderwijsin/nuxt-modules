export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-turnstile"],
  turnstile: {
    enabled: true,
    siteKey: "1x00000000000000000000AA",
    secretKey: "1x0000000000000000000000000000000AA",
    adminToken: "dummy-turnstile-token"
  }
});
