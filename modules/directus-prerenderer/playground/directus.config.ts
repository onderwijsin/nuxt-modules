import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default defineDirectusConfig({
  instance: { baseUrl: "https://sandbox.directus.com" },
  client: { typegen: { enabled: false } },
  collections: [
    {
      collection: "pages",
      prerender: {
        fields: ["permalink"],
        filter: { status: { _eq: "published" } },
        fieldmap: { route: "permalink" }
      },
      sitemap: false
    },
    {
      collection: "posts",
      prerender: {
        fields: ["slug"],
        filter: { status: { _eq: "published" } },
        // Add a custom fetcher for testing purposes.
        fetcher: async ({ collection, fields, filter }) => {
          const results = await ofetch<{ data: Array<Record<string, unknown>> }>(
            joinURL("https://sandbox.directus.com", "items", collection),
            { query: { fields, filter } }
          );
          return results.data;
        },
        mapper: (item: unknown) => {
          if (!isRecord(item) || typeof item.slug !== "string") return null;
          return `/blog/${item.slug}`;
        }
      },
      sitemap: false
    }
  ]
});
