export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-cache"],
  cache: { enabled: true, adminToken: "dummy-cache-token" }
});
