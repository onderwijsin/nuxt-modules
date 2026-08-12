import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: process.env.DIRECTUS_SITEMAPS_E2E_URL },
  client: { typegen: { enabled: false } },
  collections: [
    {
      collection: "articles",
      sitemap: {
        _sitemap: "articles",
        fields: ["slug", "updated_at"],
        filter: { status: { _eq: "published" } },
        mapper: (item: unknown) => {
          if (!item || typeof item !== "object" || !("slug" in item)) return null;
          if (typeof item.slug !== "string") return null;
          return {
            loc: `/articles/${item.slug}`,
            lastmod:
              "updated_at" in item && typeof item.updated_at === "string"
                ? item.updated_at
                : undefined,
            noIndex: item.slug === "private"
          };
        }
      },
      prerender: false
    },
    {
      collection: "pages",
      sitemap: {
        _sitemap: "pages",
        fetcher: async () => [{ loc: "/custom-page" }],
        mapper: (item: unknown) =>
          item && typeof item === "object" && "loc" in item && typeof item.loc === "string"
            ? { loc: item.loc }
            : null
      },
      prerender: false
    },
    {
      collection: "unavailable",
      sitemap: {
        fetcher: async () => Promise.reject(new Error("Fixture collection unavailable")),
        mapper: (item: unknown) =>
          item && typeof item === "object" && "loc" in item && typeof item.loc === "string"
            ? { loc: item.loc }
            : null
      },
      prerender: false
    },
    { collection: "excluded", sitemap: false, prerender: false }
  ],
  sitemaps: {
    static: [{ loc: "/about", changefreq: "monthly" }],
    apiEndpoint: "/api/sitemap-source",
    cache: false,
    prerenderSitemaps: false
  }
});
