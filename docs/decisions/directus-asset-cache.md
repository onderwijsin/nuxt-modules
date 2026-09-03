# Decision: Cache public Directus assets in the Nuxt application

- **Status:** Accepted
- **Date:** 2026-09-03
- **Scope:** `@onderwijsin/nuxt-directus-client` asset proxy and cache integration

## Context

Directus asset responses can be significantly slower than normal API requests. The Directus client
already proxies assets through Nuxt, making the application a suitable place to optionally cache
public asset responses.

The solution must remain portable across Node, Cloudflare, and other Nitro deployments, and must not
risk caching authenticated assets.

## Decision

The Directus asset proxy supports optional caching through `ocache`.

Caching is disabled by default. When enabled, the consuming application provides a named Nitro
storage mount:

```ts
client: {
  assets: {
    cache: {
      enabled: true,
      storage: "directus-assets",
      maxAge: 2_592_000
    }
  }
}
```

The Directus client owns cache behavior. The consuming application owns the storage backend,
capacity, persistence, and pruning.

Only anonymous Directus requests participate in the cache:

```text
asset request
  ↓
ocache
  ├─ hit → return cached public asset
  └─ miss → anonymous Directus request
               ├─ public 200 → cache
               └─ 401/403 → session retry outside cache
```

Authenticated responses are never cached.

A response is cached only when it:

- has status `200`;
- explicitly contains `Cache-Control: public`;
- does not contain `private` or `no-store`.

The complete query string participates in the cache key, preserving all Directus transformation
parameters. Responses also vary by `Accept` to support content negotiation such as `format=auto`.

Binary responses are stored with `ocache.createBlobStorage()` over raw Nitro/unstorage operations.

The cached handler is created once per runtime instance and reused so concurrent cold requests for
the same asset can be deduplicated.

Nitro route caching remains disabled for the asset proxy. Cache invalidation is not implemented yet;
entries expire according to their configured lifetime.

## Alternatives considered

- **Nitro route cache:** rejected because the dedicated asset cache needs explicit binary,
  authentication, query, and content-negotiation semantics.
- **Dedicated Nginx/Varnish cache:** valid infrastructure option, but not portable as part of the
  Nuxt module.
- **Cache authenticated assets:** rejected because of the additional security and cache-isolation
  complexity.
- **Module-owned storage driver:** rejected because storage topology belongs to the consuming
  application.

## Consequences

Applications can avoid repeated Directus asset latency without requiring additional infrastructure.

Consumers that enable caching must configure a compatible Nitro storage mount. Filesystem consumers
may additionally need their own capacity limit or pruning strategy.

The cache improves application delivery performance but does not replace investigation of slow
Directus-origin asset responses.

## Reconsideration criteria

Revisit this decision if Nitro provides an equivalent portable binary HTTP cache, authenticated
asset caching becomes necessary, or TTL-based freshness is no longer sufficient and explicit
invalidation is required.
