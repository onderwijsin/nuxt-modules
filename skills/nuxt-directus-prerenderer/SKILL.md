---
name: nuxt-directus-prerenderer
description: Configure Directus-backed Nuxt prerender routes with collection fetchers and mappers.
---

# Nuxt Directus Prerenderer

Use `@onderwijsin/nuxt-directus-prerenderer` to discover Nuxt prerender routes from Directus
collections during builds. Do not assume a `slug`, `permalink`, or page schema.

Register `@onderwijsin/nuxt-directus-config` before this module when using executable shared
configuration. Use `prerender.mapper` for composite routes such as
`${page.parent.path}/${page.slug}`. Use `prerender.fieldmap.route` only when one fetched field
already contains the complete route.

The module-owned build-time client reads `directusPrerenderer.instance`, falling back to the shared
`instance` in `directus.config.ts`. It cannot use `useDirectusServer` because Nuxt module setup has
no Nitro request event or runtime server context.

```ts
export default defineDirectusConfig({
  collections: [
    {
      collection: "pages",
      sitemap: false,
      prerender: {
        fields: ["parent.path", "slug"],
        filter: { status: { _eq: "published" } },
        mapper: (page) => `${page.parent.path}/${page.slug}`
      }
    }
  ]
});
```

The module fetches during Nuxt build setup, deduplicates routes, and registers them through
`prerender:routes`. `includeStaticSitemapUrls` is opt-in and reads shared `sitemaps.static` URLs.
Sitemap XML prerendering remains the responsibility of `directusSitemaps.prerenderSitemaps`.
