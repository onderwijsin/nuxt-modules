import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: [
    "@onderwijsin/nuxt-directus-config",
    "@onderwijsin/nuxt-directus",
    "@nuxtjs/sitemap",
    "@onderwijsin/nuxt-directus-sitemaps"
  ],
  appConfig: { packageName }
});
