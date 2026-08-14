# @onderwijsin/nuxt-directus-prerenderer

Prerender routes discovered from Directus collections during Nuxt builds. The module fetches
configured records during module setup, maps them to application paths, deduplicates the result, and
adds the routes through Nuxt's `prerender:routes` hook.

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus-prerenderer
```

Install the shared config module when using executable mappers or fetchers:

```sh
pnpm add @onderwijsin/nuxt-directus-config
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus-prerenderer"]
});
```

## Configuration

Collection configuration belongs in `directus.config.ts` when it uses functions:

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: { baseUrl: "https://cms.example.com", staticToken: "build-token" },
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

`mapper` is the recommended way to build composite routes. It may return a route, multiple routes,
or `null`/`undefined` to omit an item. A declarative field map is available for direct permalink
fields:

```ts
prerender: {
  fields: ["permalink"],
  fieldmap: { route: "permalink" }
}
```

The mapper takes precedence over `fieldmap`. Routes must be paths beginning with `/`, including `/`.
Invalid mapped values are omitted.

## Options

| Option                                         | Default         | Description                                                                  |
| ---------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `directusPrerenderer.enabled`                  | `true`          | Enables the module.                                                          |
| `directusPrerenderer.instance`                 | `{}`            | Module-owned build-time Directus `baseUrl` and optional `staticToken`.       |
| `directusPrerenderer.collections`              | `[]`            | Serializable collection overrides.                                           |
| `directusPrerenderer.includeStaticSitemapUrls` | `false`         | Adds static URLs from `directusSitemaps.static` or shared `sitemaps.static`. |
| `directusPrerenderer.queryLimit`               | `100`           | Page size for the default Directus fetcher.                                  |
| `directusPrerenderer.failureMode`              | `"best-effort"` | Omits failed collections or aborts with `"hard-failure"`.                    |

Module-local collection overrides may define `fields`, `filter`, and `fieldmap`; executable `mapper`
and `fetcher` functions must remain in `directus.config.ts`.

The default fetcher uses `directusPrerenderer.instance` (falling back to the shared `instance` in
`directus.config.ts`) and paginates with `queryLimit`. Custom fetchers receive
`{ collection, fields, filter }` and own their pagination. The module creates a build-time Directus
SDK client because `useDirectusServer` requires a Nitro request event and runtime server context;
neither is available while Nuxt setup discovers prerender routes. Successful setup fetches are
shared between Directus build-time modules through the module-utils setup cache. Sitemap source
fetching is runtime behavior and is not cached by this module.

Sitemap XML prerendering remains controlled by `directusSitemaps.prerenderSitemaps`; this module
only adds content routes.
