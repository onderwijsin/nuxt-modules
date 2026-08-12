import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default defineDirectusConfig({
  instance: { baseUrl: "https://sandbox.directus.com" },
  client: { typegen: { enabled: false } },
  collections: [
    {
      collection: "pages",
      sitemap: {
        _sitemap: "pages",
        fields: ["permalink", "status", "seo", "date_updated"],
        filter: { status: { _eq: "published" } },
        mapper: (item: unknown) => {
          if (!isRecord(item) || typeof item.permalink !== "string") return null;
          if (isRecord(item.seo) && item.seo.no_index === true) return null;

          return {
            loc: item.permalink,
            lastmod: typeof item.date_updated === "string" ? item.date_updated : undefined
          };
        }
      },
      prerender: false
    },
    {
      collection: "posts",
      sitemap: {
        _sitemap: "posts",
        fields: ["slug", "status", "seo", "date_updated"],
        filter: { status: { _eq: "published" } },
        mapper: (item: unknown) => {
          if (!isRecord(item) || typeof item.slug !== "string") return null;
          if (isRecord(item.seo) && item.seo.no_index === true) return null;

          return {
            loc: `/blog/${item.slug}`,
            lastmod: typeof item.date_updated === "string" ? item.date_updated : undefined
          };
        }
      },
      prerender: false
    }
  ],
  sitemaps: { static: [{ loc: "/test" }] }
});
