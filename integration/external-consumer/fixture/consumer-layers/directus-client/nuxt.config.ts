export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-client"],
  directusClient: {
    enabled: process.env.DIRECTUS_EXTERNAL_DISABLED !== "true",
    instance: { baseUrl: "http://127.0.0.1:1" },
    client: {
      auth: { enabled: false },
      assets: {
        enabled: true,
        publicOnly: true,
        cache: { enabled: true, storage: "directus-assets", maxAge: 60 }
      }
    }
  }
});
