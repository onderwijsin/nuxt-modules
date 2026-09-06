import directusModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [directusModule],
  directusClient: {
    instance: {
      baseUrl: process.env.DIRECTUS_PRUNE_E2E_URL ?? "https://sandbox.directus.com"
    },
    client: {
      typegen: { enabled: false },
      assets: {
        cache: {
          enabled: true,
          storage: "directus-assets",
          maxAge: 1,
          swr: false,
          prune: { enabled: true, onRequest: true, interval: 1 }
        }
      }
    }
  },
  nitro: {
    storage: {
      "directus-assets": {
        driver: "fs",
        base: process.env.DIRECTUS_PRUNE_E2E_CACHE_DIR
      }
    }
  }
});
