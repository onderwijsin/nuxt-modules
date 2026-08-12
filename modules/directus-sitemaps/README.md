# @onderwijsin/nuxt-directus-sitemaps

Generate [@nuxtjs/sitemap](https://nuxtseo.com/docs/sitemap) URLs from Directus. Collection
configuration defines what to fetch and maps each record to an application URL, without assuming a
Directus schema, slug field, or SEO structure.

## Requirements

| Package                             | Why it is needed                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `@onderwijsin/nuxt-directus`        | Provides the server-side Directus client used by the default collection fetcher. |
| `@nuxtjs/sitemap`                   | Renders the registered dynamic source as sitemap XML.                            |
| `@onderwijsin/nuxt-directus-config` | Recommended for executable collection mappers and custom fetchers.               |

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus-config @onderwijsin/nuxt-directus @nuxtjs/sitemap @onderwijsin/nuxt-directus-sitemaps
```

Register the shared config module before its consumers:

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

## Shared configuration

Create `directus.config.ts` in the Nuxt root. This is the recommended place for sitemap collections:
the source is server-only, so it preserves `mapper` and `fetcher` functions without serializing them
into client or runtime configuration.

```ts
// directus.config.ts
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

### Collection configuration

`collections.collections` is shared with related Directus modules. A collection uses sitemap
generation when `sitemap` is an object; set it to `false` to exclude it.

| Option             | Required         | Description                                                                                      |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------ |
| `collection`       | Yes              | Directus collection name.                                                                        |
| `sitemap`          | Yes              | `false`, or the sitemap configuration below.                                                     |
| `sitemap._sitemap` | No               | Named `@nuxtjs/sitemap` sitemap that receives this collection’s mapped URLs.                     |
| `sitemap.fields`   | No               | Directus fields passed to the default fetcher. Defaults to `['*']`.                              |
| `sitemap.filter`   | No               | Directus filter passed to the default fetcher. Defaults to `{}`.                                 |
| `sitemap.fetcher`  | No               | Async replacement fetcher. It receives `{ collection, fields, filter }` and resolves to records. |
| `sitemap.mapper`   | Yes when enabled | Maps each fetched record to sitemap entries.                                                     |
| `prerender`        | Yes              | Reserved shared setting; use `false` until the Directus prerender module is available.           |

The default fetcher reads the configured collection with its `fields` and `filter`. A custom
`fetcher` replaces only that data source; the module always applies `mapper` to its records.

`mapper(item)` may return one entry, an array, `null`, or `undefined`:

| Property      | Type                        | Description                                   |
| ------------- | --------------------------- | --------------------------------------------- |
| `path`        | `string`                    | Required application path beginning with `/`. |
| `lastUpdated` | `string`                    | Optional value rendered as sitemap `lastmod`. |
| `noIndex`     | `boolean`                   | When `true`, the entry is omitted.            |
| `priority`    | `0`–`1` in `0.1` increments | Optional sitemap priority.                    |

Set `sitemap._sitemap` to route a collection’s entries to a named sitemap. The module registers the
corresponding child source with `@nuxtjs/sitemap`; multiple collections may use the same name. Named
XML routes use the sitemap module’s `sitemapsPathPrefix` (by default, `/__sitemap__/<name>.xml`) and
`/sitemap` redirects to `/sitemap_index.xml`.

## Sitemap delivery options

Configure delivery independently of collection selection under `sitemaps`:

| Option              | Default                                      | Description                                                                         |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `static`            | `[]`                                         | Static sitemap entries. Each needs `loc`; other sitemap entry fields are preserved. |
| `apiEndpoint`       | `/api/_directus-sitemaps/urls`               | Dynamic source endpoint registered with `@nuxtjs/sitemap`.                          |
| `enablePrettyUrls`  | `true`                                       | Redirects `/sitemap` to the sitemap XML or sitemap index.                           |
| `cache`             | `{ maxAge: 300, staleMaxAge: 0, swr: true }` | Nitro cache policy for the source endpoint, or `false`.                             |
| `prerenderSitemaps` | `false`                                      | Prerenders the source endpoint and sitemap XML, including named sitemap routes.     |

`directusSitemaps` accepts the same `collections` and `sitemaps` option shape, plus `enabled`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  directusSitemaps: {
    enabled: true,
    sitemaps: { cache: false, prerenderSitemaps: true }
  }
});
```

Direct module settings take precedence over shared settings. Put executable collection definitions
in `directus.config.ts`; Nuxt module options are serialized and cannot safely carry mapper or
fetcher functions to the server runtime.

## Source endpoint

The module registers `sitemaps.apiEndpoint` as an `@nuxtjs/sitemap` source. It returns a JSON array
of sitemap URL entries and accepts these optional query parameters:

| Parameter       | Type             | Description                                                |
| --------------- | ---------------- | ---------------------------------------------------------- |
| `collection`    | non-empty string | Limits dynamic URLs to one configured Directus collection. |
| `includeStatic` | boolean string   | Includes static entries; defaults to `true`.               |

Invalid query values receive a `400` response. This endpoint is intended for `@nuxtjs/sitemap`; it
does not expose Directus credentials or collection configuration.

## Caching, prerendering, and failures

`cache` affects only the public source response. Every cache revalidation fetches Directus again;
the module does not cache Directus data itself. With `prerenderSitemaps: true`, Directus must be
reachable during the build.

Collections run independently. A failed collection fetch or invalid mapper result is logged and
omitted, while successful collections and static URLs remain in the response.

## Public API and compatibility

This package is a Nuxt module and does not expose runtime composables or client aliases. Configure
it through `directusSitemaps`, `directus.config.ts`, and the sitemap source endpoint described
above.

Requires Nuxt 4, Node.js 22+, `@onderwijsin/nuxt-directus` 0.2+, and `@nuxtjs/sitemap` 8+. It uses
Nitro-compatible server APIs and supports Node and edge-style Nitro deployments.
