import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: process.env.DIRECTUS_EXTERNAL_URL ?? "https://directus.invalid" },
  client: {
    typegen: { enabled: false },
    auth: {
      enabled: true,
      user: {
        enabled: true,
        fields: ["id", "email", { role: ["id", "name"] }],
        mapper: (user) => ({
          id: user.id,
          email: user.email,
          displayName: user.email,
          role: user.role?.name ?? null
        })
      }
    }
  },
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
