export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-client"],
  nitro: {
    storage: {
      "directus-auth-refresh": { driver: "memory" }
    }
  },
  directusClient: {
    enabled: process.env.DIRECTUS_EXTERNAL_DISABLED !== "true",
    instance: { baseUrl: "http://127.0.0.1:1" },
    client: {
      auth: {
        enabled: true,
        sessionSecret: "external-consumer-directus-session-secret-32-chars",
        cookie: { secure: false }
      },
      assets: {
        enabled: true,
        publicOnly: true,
        cache: { enabled: true, storage: "directus-assets", maxAge: 60 }
      }
    }
  }
});
