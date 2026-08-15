# @onderwijsin/nuxt-redirects

Dynamic redirects for Nuxt, independent of where your redirect data comes from.

The module collects redirects from one or more external sources and stores them in Nitro storage for
fast request-time lookups. Redirects are resolved locally, so handling a request never requires a
call to the original provider.

## Features

- Combine redirects from any number of consumer-defined sources, with deterministic
  first-source-wins precedence.
- Keep redirects up to date through background refreshes or individual webhook updates.
- Use any Nitro storage driver, including Redis.
- Enable server middleware, the client-side Pinia store, and route middleware independently.
- Configure Nitro caching separately for both public read endpoints.
- Exclude namespaces or individual routes using efficient precompiled matchers.
- Opt in to route-pattern redirects with `dynamicMatching` and `match: "pattern"`.

## Installation

```sh
pnpm add @onderwijsin/nuxt-redirects
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-redirects"]
});
```

## Source registration

Add one source per external system under `server/redirects/`. A source owns provider-specific
authentication, pagination, field mapping, and filtering of inactive or time-limited records.

```ts
// server/redirects/cms.ts
import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(async (event) => {
  const records = await getCmsRedirects(event);
  return records.map((record) => ({
    from: record.origin,
    to: record.destination,
    statusCode: record.permanent ? 301 : 302
  }));
});
```

Sources are discovered recursively in lexicographic file-path order. The first occurrence of a
normalized origin wins, including duplicates within the same source. Later duplicates are logged
loudly and ignored; they never fail a complete refresh.

Origins are normalized during ingestion: non-root trailing slashes are removed and query key/value
pairs are sorted. An origin with a query matches only the same normalized query; a path-only origin
is the fallback for requests with query parameters. Destination query strings are preserved and
request query parameters are never appended implicitly. Protocol-less domains such as
`sub.example.com/new` are treated as external HTTPS destinations; explicit URLs and internal paths
are otherwise used unchanged. Destinations must be an internal path, protocol-relative URL, absolute
HTTP(S) URL, or bare domain; control characters and other schemes such as `javascript:` and `data:`
are rejected during ingestion.

## Refreshing

The module deliberately does not schedule work. It registers discovered sources once during Nitro
startup, then exposes a normal task handler:

```ts
// server/tasks/redirects/refresh.ts
export { default } from "@onderwijsin/nuxt-redirects/runtime/refresh-task";
```

The task name follows its file path: `server/tasks/redirects/refresh.ts` becomes
`redirects:refresh`. Schedule that consumer task through the application's Nitro configuration.
`refreshRedirects()` is also exported from the runtime package for protected deployment endpoints.

## Webhooks

Provider webhooks remain consumer routes, because their payload and authentication are
provider-specific. Map a verified payload to the public mutation helpers:

```ts
import { removeRedirect, upsertRedirect } from "@onderwijsin/nuxt-redirects/runtime";

export default defineEventHandler(async (event) => {
  const change = await verifyAndParseWebhook(event);
  if (change.kind === "delete") return removeRedirect(change.from);
  return upsertRedirect({ from: change.from, to: change.to, statusCode: change.statusCode });
});
```

## Storage drivers

The module stores redirect data and both cached read endpoints in Nitro's configured storage mount.
It defaults to `redirects`; configure any Nitro storage driver under that name when the index and
cache must be shared across instances or survive process replacement:

```ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      redirects: {
        driver: "redis"
        /* Redis driver connector options */
      }
    }
  }
});
```

Use a shared driver for horizontally scaled or serverless production deployments. Cache reads,
writes, and mutation/refresh invalidation follow the same mount. If your storage configuration uses
a different mount name, set the matching module option:

```ts
export default defineNuxtConfig({
  redirects: { storageMount: "shared-redirects" },
  nitro: { storage: { "shared-redirects": { driver: "redis" } } }
});
```

## Dynamic Pattern Matching

Dynamic pattern matching is disabled by default. Enable it at the module level, then opt individual
redirects in with `match: "pattern"`:

```ts
export default defineNuxtConfig({
  redirects: { dynamicMatching: true }
});
```

```ts
export default defineRedirectSource(() => [
  {
    from: "/legacy/:section/:slug",
    to: "/docs/:section/:slug",
    statusCode: 301,
    match: "pattern"
  },
  { from: "/files/*", to: "/downloads/*", match: "pattern" }
]);
```

These rules use the `regexparam` route-pattern syntax. `:name` captures one path segment, `:name?`
makes a segment optional, and `*` captures a wildcard path. Exact query and path-only redirects are
always checked before pattern rules. Pattern rules match the pathname only, so incoming query
parameters are not copied to the destination.

For example, `/legacy/guides/getting-started` becomes `/docs/guides/getting-started`, and
`/files/reports/2026.pdf` becomes `/downloads/reports/2026.pdf`. Raw regular expressions and
constrained parameter groups such as `:id<[0-9]+>` are not supported.

## Endpoints and client behavior

`GET /api/_redirects` returns the compact exact index as a `{ [origin]: Redirect }` object. When
`dynamicMatching` is enabled, the response also includes serializable `dynamic` pattern rules.
`GET /api/_redirects/:path` looks up one encoded path/query origin and is used when client route
middleware is on but the store is off. Both are wrapped in `defineCachedEventHandler`; configure
`cache.index` and `cache.lookup` separately.

`upsertRedirect()`, `removeRedirect()`, and a complete source refresh immediately invalidate
affected public cache entries; an upsert also primes its exact lookup response. A path-only change
or complete refresh clears all lookup entries because path-only redirects are query fallbacks. Use a
short `cache.index` TTL when the Pinia store must converge quickly after webhooks; a webhook-driven
setup can safely use a longer `cache.lookup` TTL because mutations and refreshes invalidate affected
entries.

Lookup cache keys are derived from the complete normalized origin, including its query string, so
distinct paths and query variants never share a cache record.

```ts
export default defineNuxtConfig({
  redirects: {
    cache: {
      index: { maxAge: 15, staleMaxAge: 60, swr: true },
      lookup: { maxAge: 3600, staleMaxAge: 3600, swr: true }
    }
  }
});
```

`serverMiddleware`, `store`, and `routeMiddleware` are independent. When `routeMiddleware` is true
and `store` is false, every client navigation uses the cached single-path endpoint instead of
loading the complete index. Enabling `store` installs `@pinia/nuxt` and
`pinia-plugin-persistedstate/nuxt` as module dependencies. The client store persists its redirect
index and last-fetch timestamp in browser `localStorage`, not cookies.

## Configuration

```ts
export default defineNuxtConfig({
  redirects: {
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    storageMount: "redirects",
    storeRefreshInterval: 3600,
    excludedNamespaces: ["/api", "/_nuxt", "/_payload", "/__"],
    excludedRoutes: ["/"],
    cache: {
      index: { maxAge: 60, staleMaxAge: 300, swr: true },
      lookup: { maxAge: 60, staleMaxAge: 300, swr: true }
    }
  }
});
```

## Compatibility

Developed against Nuxt 4.5.x and Node.js 24. The package requires Node.js 24 or newer.
