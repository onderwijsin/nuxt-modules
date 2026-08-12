import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: [
    "@onderwijsin/nuxt-directus-config",
    "@onderwijsin/nuxt-directus",
    "@onderwijsin/nuxt-directus-sitemaps",
    "@nuxtjs/sitemap"
  ],
  appConfig: { packageName },
  sitemap: false
});
