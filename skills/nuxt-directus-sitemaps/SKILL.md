---
name: nuxt-directus-sitemaps
description:
  Configure @onderwijsin/nuxt-directus-sitemaps for schema-agnostic Directus sitemap URLs in Nuxt 4.
---

# Nuxt Directus Sitemaps

Use `@onderwijsin/nuxt-directus-sitemaps` to add a Directus-backed source to `@nuxtjs/sitemap`.
Collection configuration explicitly controls the Directus fields, filter, optional data fetcher, and
mapper. Do not assume `slug`, dates, SEO fields, path prefixes, or named sitemaps.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-directus-config @onderwijsin/nuxt-directus @nuxtjs/sitemap @onderwijsin/nuxt-directus-sitemaps
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    "@onderwijsin/nuxt-directus-config",
    "@onderwijsin/nuxt-directus",
    "@onderwijsin/nuxt-directus-sitemaps",
    "@nuxtjs/sitemap"
  ]
});
```

Register `@onderwijsin/nuxt-directus-config` before the consuming modules. It is the supported
source for executable `mapper` and `fetcher` functions.

## Recommended configuration

Create `directus.config.ts` in the Nuxt root:

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: "https://cms.example.com" },
  collections: {
    collections: [
      {
        collection: "articles",
        sitemap: {
          _sitemap: "articles",
          fields: ["slug", "updated_at"],
          filter: { status: { _eq: "published" } },
          mapper: (item) => {
            if (
              !item ||
              typeof item !== "object" ||
              !("slug" in item) ||
              typeof item.slug !== "string"
            ) {
              return null;
            }

            return {
              path: `/articles/${item.slug}`,
              lastUpdated:
                "updated_at" in item && typeof item.updated_at === "string"
                  ? item.updated_at
                  : undefined,
              priority: 0.8
            };
          }
        },
        prerender: false
      }
    ]
  },
  sitemaps: {
    static: [{ loc: "/about" }],
    apiEndpoint: "/api/_directus-sitemaps/urls",
    cache: { maxAge: 300, staleMaxAge: 0, swr: true },
    prerenderSitemaps: false
  }
});
```

`mapper(item)` returns an entry, entries, `null`, or `undefined`. An entry has the following shape:

| Property      | Type                        | Required | Description                          |
| ------------- | --------------------------- | -------- | ------------------------------------ |
| `path`        | `string`                    | Yes      | Application path beginning with `/`. |
| `lastUpdated` | `string`                    | No       | Rendered as sitemap `lastmod`.       |
| `noIndex`     | `boolean`                   | No       | Omits the entry when `true`.         |
| `priority`    | `0`–`1` in `0.1` increments | No       | Sitemap priority.                    |

The default fetcher uses the configured collection, fields, and filter. `fetcher(context)` replaces
that source and receives `{ collection, fields, filter }`; it must resolve to records, which are
then passed to `mapper`.

## Complete module option reference

Configure direct module settings under `directusSitemaps`. They use the same `collections` and
`sitemaps` schema as `directus.config.ts`; serializable direct settings take precedence. Keep
collection mappers and custom fetchers in the shared config source.

| Prop name                                                     | Data type                                                       | Required         | Description                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `directusSitemaps.enabled`                                    | `boolean`                                                       | No               | Defaults to `true`; disables module setup when `false`.                               |
| `directusSitemaps.collections`                                | `{ collections: DirectusCollectionConfig[] }`                   | No               | Shared collection settings; defaults to `{ collections: [] }`.                        |
| `directusSitemaps.collections.collections[].collection`       | non-empty `string`                                              | Yes              | Directus collection name.                                                             |
| `directusSitemaps.collections.collections[].sitemap`          | `false \| object`                                               | Yes              | `false` excludes this collection; otherwise enables sitemap generation.               |
| `directusSitemaps.collections.collections[].sitemap._sitemap` | non-empty `string`                                              | No               | Named sitemap receiving this collection’s URLs.                                       |
| `directusSitemaps.collections.collections[].sitemap.fields`   | non-empty `string[]`                                            | No               | Directus fields for the default fetcher; defaults to `['*']`.                         |
| `directusSitemaps.collections.collections[].sitemap.filter`   | `Record<string, unknown>`                                       | No               | Directus filter for the default fetcher; defaults to `{}`.                            |
| `directusSitemaps.collections.collections[].sitemap.fetcher`  | `({ collection, fields, filter }) => Promise<readonly Item[]>`  | No               | Replaces the default fetcher; mapper still runs afterward.                            |
| `directusSitemaps.collections.collections[].sitemap.mapper`   | `(item) => SitemapEntry \| SitemapEntry[] \| null \| undefined` | Yes when enabled | Maps each fetched record.                                                             |
| `directusSitemaps.collections.collections[].prerender`        | `false \| {}`                                                   | Yes              | Reserved for the future Directus prerender module; set `false`.                       |
| `directusSitemaps.sitemaps.static`                            | `Array<{ loc: string; … }>`                                     | No               | Defaults to `[]`; entries need `loc` and may include other sitemap fields.            |
| `directusSitemaps.sitemaps.apiEndpoint`                       | absolute path string                                            | No               | Defaults to `/api/_directus-sitemaps/urls`.                                           |
| `directusSitemaps.sitemaps.enablePrettyUrls`                  | `boolean`                                                       | No               | Defaults to `true`; redirects `/sitemap` to `/sitemap.xml`.                           |
| `directusSitemaps.sitemaps.cache`                             | `false \| { maxAge, staleMaxAge, swr }`                         | No               | Defaults to `{ maxAge: 300, staleMaxAge: 0, swr: true }`; source-response cache only. |
| `directusSitemaps.sitemaps.cache.maxAge`                      | non-negative integer                                            | No               | Fresh response lifetime in seconds; defaults to `300`.                                |
| `directusSitemaps.sitemaps.cache.staleMaxAge`                 | non-negative integer                                            | No               | Stale response lifetime in seconds; defaults to `0`.                                  |
| `directusSitemaps.sitemaps.cache.swr`                         | `boolean`                                                       | No               | Enables stale-while-revalidate; defaults to `true`.                                   |
| `directusSitemaps.sitemaps.prerenderSitemaps`                 | `boolean`                                                       | No               | Defaults to `false`; prerenders the source and sitemap XML routes.                    |

## Endpoint and runtime behavior

The module registers `sitemaps.apiEndpoint` as an `@nuxtjs/sitemap` source. It accepts these query
parameters:

| Parameter       | Data type        | Required | Description                                       |
| --------------- | ---------------- | -------- | ------------------------------------------------- |
| `collection`    | non-empty string | No       | Limits dynamic URLs to one configured collection. |
| `includeStatic` | boolean string   | No       | Includes static entries; defaults to `true`.      |

Invalid query values return `400`. Each collection is independent: a failed fetch or invalid mapper
entry is logged and omitted, while successful collections and static entries remain available.

`cache` never caches Directus responses; revalidation fetches Directus again. With
`prerenderSitemaps: true`, Directus must be available during the build. The module prerenders the
source endpoint and sitemap XML. `sitemap._sitemap` routes a collection’s mapped URLs to a named
sitemap, adds `_sitemap` to the source entries, and registers its child source. Named routes default
to `/__sitemap__/<name>.xml`; `/sitemap` redirects to `/sitemap_index.xml` when they are present.

## Public API and boundaries

This package exposes a Nuxt module only: it has no runtime composables, client aliases, or public
runtime-config values. Configure it with `directusSitemaps` and `directus.config.ts`.

Do not place Directus credentials in sitemap configuration. The Directus client module owns
credentials, and collection functions remain in the server-only shared Directus config source.

Requires Nuxt 4, Node.js 22+, `@onderwijsin/nuxt-directus` 0.2+, and `@nuxtjs/sitemap` 8+. Nitro
server runtime support includes Node and edge-style deployments.
