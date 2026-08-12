export default {
  instance: {
    baseUrl: "https://cms.example.test",
    staticToken: "server-only-static-token"
  },
  client: {
    proxy: { path: "/_cms" },
    commands: ["readItems"],
    auth: {
      enabled: true,
      turnstile: { enabled: true },
      cookie: { name: "cms_session" }
    },
    typegen: { introspectionToken: "server-only-introspection-token" }
  },
  collections: {
    collections: [
      {
        collection: "articles",
        sitemap: { mapper: () => ({ path: "/articles" }) },
        prerender: false
      }
    ]
  },
  sitemaps: {
    apiEndpoint: "/api/sitemap-source",
    prerenderSitemaps: true
  }
};
