import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-directus"],
  appConfig: { packageName },
  directus: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN,
    typegen: { introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN }
  }
});
