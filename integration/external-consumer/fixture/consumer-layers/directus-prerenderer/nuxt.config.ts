export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-prerenderer"],
  directusPrerenderer: { enabled: true },
  // This layer intentionally runs without @onderwijsin/nuxt-directus-config. Keep the
  // executable fixture data on Nuxt's internal resolved-config slot so the isolated package
  // contract can exercise a custom fetcher without activating the shared config module.
  _directus: {
    collections: [
      {
        collection: "synthetic_prerender_routes",
        sitemap: false,
        prerender: {
          fetcher: async () => ["/this-is-a-prerendered-route"]
        }
      }
    ]
  }
});
