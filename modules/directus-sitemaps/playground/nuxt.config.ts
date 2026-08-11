import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-directus", "@nuxtjs/sitemap", "@onderwijsin/nuxt-directus-sitemaps"],
  appConfig: { packageName },
  directus: { baseUrl: "https://sandbox.directus.com", typegen: { enabled: false } },
  directusSitemaps: {
    enabled: true,
    collections: [],
    static: [{ loc: "/", _sitemap: "pages" }]
  }
});
