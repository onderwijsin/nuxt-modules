---
name: nuxt-directus-sitemaps
description:
  Configure @onderwijsin/nuxt-directus-sitemaps for schema-agnostic Directus sitemap URLs in Nuxt 4.
---

# Nuxt Directus Sitemaps

Use `@onderwijsin/nuxt-directus-sitemaps` to add a Directus-backed source to `@nuxtjs/sitemap`.
Collection configuration explicitly controls the Directus fields, filter, declarative fieldmap, and
optional executable shared mapper/fetcher. Do not assume `slug`, dates, SEO fields, path prefixes,
or named sitemaps.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-directus-client @nuxtjs/sitemap @onderwijsin/nuxt-directus-sitemaps
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    "@onderwijsin/nuxt-directus-config",
    "@onderwijsin/nuxt-directus-client",
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
            loc: `/articles/${item.slug}`,
            lastmod:
              "updated_at" in item && typeof item.updated_at === "string"
                ? item.updated_at
                : undefined,
            priority: 0.8
          };
        }
      },
      prerender: false
    }
  ],
  sitemaps: {
    static: [{ loc: "/about" }],
    apiEndpoint: "/api/_directus-sitemaps/urls",
    cache: { maxAge: 300, staleMaxAge: 0, swr: true },
    prerenderSitemaps: false
  }
});
```

`mapper(item)` returns one entry, `null`, or `undefined`. An entry has the following shape:

| Property   | Type                        | Required | Description                          |
| ---------- | --------------------------- | -------- | ------------------------------------ |
| `loc`      | `string`                    | Yes      | Application path beginning with `/`. |
| `lastmod`  | `string` or `Date`          | No       | Last-modified value.                 |
| `noIndex`  | `boolean`                   | No       | Omits the entry when `true`.         |
| `priority` | `0`–`1` in `0.1` increments | No       | Sitemap priority.                    |

The default fetcher uses the configured collection, fields, and filter. Runtime mapping uses this
precedence: shared `fetcher`, shared executable `mapper`, declarative `fieldmap`, then identity
mapping. A custom fetcher is supported only in shared `directus.config.ts`.

## Complete module option reference

Configure direct module settings under `directusSitemaps`. Collection settings are serializable and
are merged by collection name with shared configuration. Keep executable mappers and custom fetchers
in the shared config source.

| Prop name                                         | Data type                                     | Required | Description                                                                           |
| ------------------------------------------------- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `directusSitemaps.enabled`                        | `boolean`                                     | No       | Defaults to `true`; disables module setup when `false`.                               |
| `directusSitemaps.collections`                    | `DirectusCollectionConfig[]`                  | No       | Serializable collection settings; defaults to `[]`.                                   |
| `directusSitemaps.collections[].collection`       | non-empty `string`                            | Yes      | Directus collection name.                                                             |
| `directusSitemaps.collections[].sitemap`          | `false \| object`                             | Yes      | `false` excludes this collection; otherwise enables sitemap generation.               |
| `directusSitemaps.collections[].sitemap._sitemap` | non-empty `string`                            | No       | Named sitemap receiving this collection’s URLs.                                       |
| `directusSitemaps.collections[].sitemap.fields`   | non-empty `string[]`                          | No       | Directus fields for the default fetcher; defaults to `['*']`.                         |
| `directusSitemaps.collections[].sitemap.filter`   | `Record<string, unknown>`                     | No       | Directus filter for the default fetcher; defaults to `{}`.                            |
| `directusSitemaps.collections[].sitemap.fieldmap` | `{ loc: string; [property: string]: string }` | No       | Maps sitemap properties to Directus record properties.                                |
| `directusSitemaps.collections[].sitemap.fetcher`  | Not supported in direct options               | No       | Use shared `directus.config.ts` for custom fetchers.                                  |
| `directusSitemaps.collections[].sitemap.mapper`   | Not supported in direct options               | No       | Use shared `directus.config.ts` for executable mappers.                               |
| `directusSitemaps.collections[].prerender`        | `false \| {}`                                 | Yes      | Reserved for the future Directus prerender module; set `false`.                       |
| `directusSitemaps.static`                         | `Array<{ loc: string; … }>`                   | No       | Defaults to `[]`; entries need `loc` and may include other sitemap fields.            |
| `directusSitemaps.apiEndpoint`                    | absolute path string                          | No       | Defaults to `/api/_directus-sitemaps/urls`.                                           |
| `directusSitemaps.enablePrettyUrls`               | `boolean`                                     | No       | Defaults to `true`; redirects `/sitemap` to `/sitemap.xml`.                           |
| `directusSitemaps.cache`                          | `false \| { maxAge, staleMaxAge, swr }`       | No       | Defaults to `{ maxAge: 300, staleMaxAge: 0, swr: true }`; source-response cache only. |
| `directusSitemaps.cache.maxAge`                   | non-negative integer                          | No       | Fresh response lifetime in seconds; defaults to `300`.                                |
| `directusSitemaps.cache.staleMaxAge`              | non-negative integer                          | No       | Stale response lifetime in seconds; defaults to `0`.                                  |
| `directusSitemaps.cache.swr`                      | `boolean`                                     | No       | Enables stale-while-revalidate; defaults to `true`.                                   |
| `directusSitemaps.prerenderSitemaps`              | `boolean`                                     | No       | Defaults to `false`; prerenders the source and sitemap XML routes.                    |

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

Requires Nuxt 4, Node.js 22+, `@onderwijsin/nuxt-directus-client` 0.3+, and `@nuxtjs/sitemap` 8+.
Nitro server runtime support includes Node and edge-style deployments.
