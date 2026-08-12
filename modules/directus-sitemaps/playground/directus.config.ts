import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: "https://sandbox.directus.com" },
  client: { typegen: { enabled: false } },
  collections: [],
  sitemaps: { static: [{ loc: "/" }] }
});
