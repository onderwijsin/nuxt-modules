---
name: nuxt-redirects
description:
  Use when configuring @onderwijsin/nuxt-redirects, writing redirect sources, scheduling refreshes,
  or integrating redirect webhooks.
---

Use `@onderwijsin/nuxt-redirects` for provider-agnostic redirects indexed in Nitro storage. Do not
perform provider I/O from request middleware: sources run only when a consumer refreshes the index.

## Setup

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-redirects"],
  redirects: {
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    storageMount: "redirects"
  }
});
```

Define default-exported sources under `server/redirects/**`:

```ts
import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(async (event) => [
  { from: "/old?q=one", to: "/new?source=redirect", statusCode: 301 }
]);
```

## Public API reference

### Module options

`redirects` accepts:

- `enabled: boolean` — defaults to `true`.
- `serverMiddleware: boolean` — defaults to `true`; enables O(1) storage lookup on server requests.
- `store: boolean` — defaults to `true`; registers the Pinia redirect index store.
- `routeMiddleware: boolean` — defaults to `true`; evaluates client navigation redirects.
- `storageMount: string` — defaults to `"redirects"`; names the Nitro storage mount.
- `storeRefreshInterval: number` — defaults to `3600` seconds; client store refresh interval.
- `excludedNamespaces: string[]` — defaults to `['/api', '/_nuxt', '/_payload', '/__']`.
- `excludedRoutes: string[]` — defaults to `['/']`.
- `cache.index` and `cache.lookup` — each accepts `{ maxAge, staleMaxAge, swr }`; defaults are
  `{ maxAge: 60, staleMaxAge: 300, swr: true }`.

### Runtime exports

Import from `@onderwijsin/nuxt-redirects/runtime`:

- `upsertRedirect(redirect)` normalizes and writes one record, updating the manifest; returns the
  normalized redirect.
- `removeRedirect(origin)` normalizes and removes one record, updating the manifest.
- `Redirect` is `{ from: string; to: string; statusCode?: 301 | 302 | 307 | 308 }`.
- `ResolvedRedirect` is a `Redirect` with a required `statusCode`; `RedirectIndex` maps normalized
  origins to `ResolvedRedirect` values.
- `RedirectSource` is `(event?: H3Event) => Redirect[] | Promise<Redirect[]>`.

Import `defineRedirectSource(source)` from `@onderwijsin/nuxt-redirects/runtime/source`; it returns
the typed source unchanged. `source(event?)` returns `Redirect[] | Promise<Redirect[]>`.

The runtime also exports `refreshRedirects(event?)` to fetch every source concurrently and replace
the merged index. Sources are registered once during Nitro startup.

Install the task in the consuming application:

```ts
// server/tasks/redirects/refresh.ts
export { default } from "@onderwijsin/nuxt-redirects/runtime/refresh-task";
```

### Client store

When `store` is enabled, import `useRedirectsStore` from
`@onderwijsin/nuxt-redirects/runtime/store`. It exposes persisted `records`, `refresh()`, and
`find(origin)`. The store persists a record keyed by normalized origin and derives a `Map` from its
entries for direct lookup.

### HTTP API

- `GET /api/_redirects` returns `{ data: RedirectIndex }` from the compact manifest.
- `GET /api/_redirects/:path` returns `{ data: Redirect | null }`, where `:path` is an encoded path
  plus optional query string.

Both endpoints use `defineCachedEventHandler` with the configured cache options.

## Precedence and query semantics

Source files are recursively discovered in lexicographic path order. The first normalized origin
wins across all sources and within a source; duplicate later entries are logged and ignored.

Origins normalize non-root trailing slashes and sort query key/value pairs. A query-bearing origin
requires the same normalized query. A path-only redirect remains a fallback for requests that have
query parameters. Destination query strings are preserved and incoming request query parameters are
never merged into destinations. Protocol-less domains such as `sub.example.com/new` are treated as
external HTTPS destinations; explicit URLs and internal paths are otherwise used unchanged.

## Storage drivers

Nitro supplies the default mount. To share redirect data between instances, configure a driver at
the configured mount name:

```ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      redirects: { driver: "redis" }
    }
  }
});
```

For another mount name, configure both `redirects.storageMount` and `nitro.storage` with the same
key. Use webhook routes for provider-specific change notifications and call `upsertRedirect` or
`removeRedirect` only after validating the provider request.
