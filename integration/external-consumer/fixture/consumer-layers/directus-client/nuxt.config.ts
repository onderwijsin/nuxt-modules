export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-client"],
  directusClient: { enabled: process.env.DIRECTUS_EXTERNAL_DISABLED !== "true" }
});
