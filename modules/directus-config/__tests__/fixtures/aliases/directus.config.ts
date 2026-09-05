export default {
  instance: {
    baseUrl: "https://cms.example.test",
    proxyToken: "server-only-static-token"
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
  collections: [
    {
      collection: "articles",
      sitemap: { mapper: () => ({ loc: "/articles" }) },
      prerender: false
    }
  ],
  sitemaps: {
    apiEndpoint: "/api/sitemap-source",
    prerenderSitemaps: true
  }
};
