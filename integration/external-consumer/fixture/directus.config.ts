import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: "https://directus.invalid" },
  client: { typegen: { enabled: false } },
  collections: [
    {
      collection: "synthetic_prerender_routes",
      sitemap: false,
      prerender: {
        fetcher: async () => ["/this-is-a-prerendered-route"]
      }
    }
  ],
  sitemaps: {
    static: [{ loc: "/external-about", changefreq: "monthly" }],
    cache: false
  }
});
