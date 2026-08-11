# @onderwijsin/nuxt-directus-sitemaps

Generate named [@nuxtjs/sitemap](https://nuxtseo.com/docs/sitemap) sources from Directus
collections.

The module queries Directus through `@onderwijsin/nuxt-directus`, so server credentials stay in the
Directus configuration and are never exposed to the browser.

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus @nuxtjs/sitemap @onderwijsin/nuxt-directus-sitemaps
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus", "@nuxtjs/sitemap", "@onderwijsin/nuxt-directus-sitemaps"],
  directus: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  directusSitemaps: {
    collections: [
      {
        collection: "articles",
        sitemap: "articles",
        pathPrefix: "/articles",
        filter: { status: { _eq: "published" } },
        fields: ["slug", "date_updated", "seo"]
      }
    ],
    static: [{ loc: "/about", _sitemap: "pages" }]
  }
});
```

The module adds each configured sitemap name to `sitemap.sitemaps` with its own source. It uses
`slug`, `date_updated`, `date_created`, and `seo` automatically; `seo.no_index` entries are skipped.
`seo.sitemap.changefreq` and `.priority` are used when present. Static entries are forwarded as-is.

## Configuration

| Option        | Default                                      | Purpose                                                                        |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| `enabled`     | `true`                                       | Disables module setup when `false`.                                            |
| `collections` | `[]`                                         | Directus collection-to-sitemap mappings.                                       |
| `static`      | `[]`                                         | Additional `SitemapUrl` entries.                                               |
| `apiEndpoint` | `/api/_directus-sitemaps/urls`               | Source endpoint registered for Nuxt Sitemap.                                   |
| `cache`       | `{ maxAge: 300, staleMaxAge: 0, swr: true }` | Optional Nitro response cache for the source endpoint; set `false` to disable. |
| `prerender`   | `false`                                      | Prerenders the source endpoint, sitemap index, and named sitemap XML files.    |

Each collection needs `collection` and `sitemap`. `pathPrefix`, `filter`, and `fields` are optional.
Set `endpointPrefix: false` (or `""`) for the Directus `users` system collection; this uses the
Directus SDK's server-safe `readUsers` command. The result is best-effort: an unavailable collection
is logged and omitted while other collections and static entries remain available.

## Prerendering and caching

`prerender: true` adds the source, `/sitemap_index.xml`, and each `/<name>-sitemap.xml` route to
Nitro's prerender routes. The source is fetched during the build, producing static sitemap files.
Leave it `false` for runtime generation. `cache` only caches the public source response; Directus is
queried afresh whenever Nitro revalidates that response.

## Compatibility

Requires Nuxt 4, Node.js 22+, `@onderwijsin/nuxt-directus` 0.2+, and `@nuxtjs/sitemap` 8+.
