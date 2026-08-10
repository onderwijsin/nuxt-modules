import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-healthcheck"],
  appConfig: { packageName },
  healthcheck: {
    directus: {
      enabled: true,
      baseUrl: "https://sandbox.directus.com"
    }
  }
});
