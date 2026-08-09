---
name: nuxt-cache
description:
  Use when configuring @onderwijsin/nuxt-cache, registering an Unstorage cache driver, inspecting
  cache metadata, or invalidating cached routes by cache base and public path.
---

Use `@onderwijsin/nuxt-cache` for driver-agnostic cache metadata and efficient, targeted cache
invalidation. It is CMS-agnostic and deliberately does not expose generic storage CRUD.

## Install and enable

```sh
pnpm add @onderwijsin/nuxt-cache unstorage
```

The documented driver modules import `unstorage` from application code, so it must be a direct
dependency. Redis and Valkey integrations also require Unstorage's Redis peer dependency:

```sh
pnpm add ioredis
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-cache"],
  cache: {
    enabled: true,
    adminToken: process.env.CACHE_ADMIN_TOKEN
  }
});
```

The module is disabled by default. Enabling it registers `POST /api/_cache/invalidate`, reserves
`/api/_cache/**`, and enables Nitro async context so the driver can associate cache writes with the
current request path. It does not configure `nitro.storage.cache`; the consuming application owns
driver registration and credentials.

The module reserves `runtimeConfig.nuxtCache` for its private server configuration. Configure the
module through the `cache` option shown above; do not set `runtimeConfig.nuxtCache` directly.

## Configuration reference

| Option                  | Default         | Contract                                                                                                   |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `enabled`               | `false`         | Registers the invalidation endpoint and runtime support.                                                   |
| `adminToken`            | —               | Production administrator token. It should be supplied through normal Nuxt runtime configuration.           |
| `adminHeaderName`       | `x-admin-token` | Header used for the administrator token; bearer authentication is also accepted.                           |
| `devAuthBypass`         | `false`         | Permits unauthenticated invalidation only in `nuxt dev`; Nuxt logs a warning. It is ignored in production. |
| `maxInvalidatedEntries` | `1000`          | Maximum matching index records that a single request may delete. Valid range: `1`–`10000`.                 |

Production requests need either:

```http
x-admin-token: <adminToken>
```

or:

```http
Authorization: Bearer <adminToken>
```

## Cache identity and storage records

A cache base is the Nitro route-rule identity `<group>:<name>`, for example `kennisbank:articles`.
Cache entries must begin with that base followed by `:`, for example
`kennisbank:articles:example-slug:abc123`.

For each cache value, the wrapped driver writes these aligned records:

```text
value:     kennisbank:articles:<suffix>
metadata:  kennisbank:articles:<suffix>$
marker:    kennisbank:articles:<suffix>$__cache_write
index:     __cache_meta:index:v1:kennisbank:articles:<encoded-path>:<encoded-key>
```

The metadata sidecar is `{ version: 1, path: "/public/route", writeId: "…" }`.
`storage.getMeta(key)` merges it with native driver metadata. `writeId` and the internal marker bind
an index to the current cache-value write, so an old or concurrent index cannot delete a newer
value. Value, metadata, marker, and index writes receive the same Unstorage options, including TTL.
`removeItem(key)` removes the related internal records. Stale index records left by expiry,
interrupted writes, or overwritten keys are removed lazily during invalidation.

## Register a driver

Create a Nitro driver module, wrap the chosen Unstorage driver, and reference that module from
`nitro.storage.cache.driver`.

### Filesystem

```js
// server/storage/cache-driver.mjs
import { createCacheDriver } from "@onderwijsin/nuxt-cache/runtime";
import { defineDriver } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

export default defineDriver((options) => createCacheDriver(fsDriver(options)));
```

### Redis or Valkey

```js
// server/storage/cache-driver.mjs
import { createCacheDriver } from "@onderwijsin/nuxt-cache/runtime";
import { defineDriver } from "unstorage";
import redisDriver from "unstorage/drivers/redis";

export default defineDriver((options) => createCacheDriver(redisDriver(options)));
```

```ts
// nuxt.config.ts
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  nitro: {
    storage: {
      cache: {
        driver: fileURLToPath(new URL("./server/storage/cache-driver.mjs", import.meta.url)),
        url: process.env.REDIS_URL
      }
    }
  }
});
```

### Cloudflare KV binding

Cloudflare KV bindings expose only one-key-at-a-time deletion. Use the Cloudflare wrapper so
`storage.clear(base)` lists and bulk-deletes all cache values, metadata sidecars, and reverse-index
records. It deduplicates the keys and sends requests in Cloudflare's maximum 10,000-key chunks.

```js
// server/storage/cache-driver.mjs
import { createCloudflareCacheDriver } from "@onderwijsin/nuxt-cache/runtime";
import { defineDriver } from "unstorage";
import cloudflareKVBindingDriver from "unstorage/drivers/cloudflare-kv-binding";

export default defineDriver(({ accountId, kvApiToken, cacheNamespaceId, ...driverOptions }) =>
  createCloudflareCacheDriver(cloudflareKVBindingDriver(driverOptions), {
    accountId,
    kvApiToken,
    cacheNamespaceId
  })
);
```

```ts
// nuxt.config.ts
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  nitro: {
    storage: {
      cache: {
        driver: fileURLToPath(new URL("./server/storage/cache-driver.mjs", import.meta.url)),
        binding: "CACHE",
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        kvApiToken: process.env.CLOUDFLARE_KV_API_TOKEN,
        cacheNamespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID
      }
    }
  }
});
```

`kvApiToken` needs permission to delete keys from `cacheNamespaceId`. Every remote bulk-delete
request has a 10-second timeout; failures identify the failed chunk without including credentials.

Both wrappers implement safe `clear()` behavior: `clear("kennisbank:articles")` removes the base's
values, metadata, markers, and reverse indexes together. `clear()` with no base clears the whole
cache mount. Do not pass a narrower arbitrary key prefix; a scoped clear must be one complete
`<group>:<name>` cache base. Both wrappers preserve `setItem()`, `setItems()`, `removeItem()`,
`getMeta()`, and `getKeys()` behavior while hiding internal records from ordinary key listing.

When writing cache entries outside a Nitro request, pass `getRequestPath` to `createCacheDriver` or
`createCloudflareCacheDriver`. It must return the public route path associated with the write.

## Invalidation API

```http
POST /api/_cache/invalidate
Content-Type: application/json
x-admin-token: <adminToken>
```

```json
{
  "targets": [
    {
      "base": "kennisbank:articles",
      "path": "/kennisbank/artikelen/example-slug",
      "match": "exact"
    }
  ]
}
```

Request body:

| Field             | Required | Contract                                                                                                                                       |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `targets`         | Yes      | Array with 1–100 invalidation targets.                                                                                                         |
| `targets[].base`  | Yes      | Cache base in `<group>:<name>` format. This scopes the index query.                                                                            |
| `targets[].path`  | Yes      | Public route path beginning with `/`, up to 2048 characters.                                                                                   |
| `targets[].match` | No       | `exact` (default) removes one route; `prefix` removes that route and `/`-separated descendants, never sibling text such as `/foo` → `/foobar`. |

For prefix matching, one trailing slash is ignored: `/foo/` behaves as `/foo`; `/` matches every
absolute cached route in the requested base.

Success response:

```json
{ "data": { "removed": 1 } }
```

The endpoint reads only reverse-index records for the requested base. It never scans the whole
`cache` mount or falls back to cache-key matching. It rejects invalid input with `400`, missing or
invalid credentials with `401`, a disabled module with `404`, and an oversized matching selection
with `413` before deleting entries.

## Low-level Cloudflare bulk deletion

`bulkDeleteCloudflareCacheKeys(keys, credentials)` is a supported server-only runtime export for
maintenance code that already knows the exact Cloudflare KV keys to delete:

```ts
import { bulkDeleteCloudflareCacheKeys } from "@onderwijsin/nuxt-cache/runtime";

await bulkDeleteCloudflareCacheKeys(["cache-key", "cache-key$"], {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  kvApiToken: process.env.CLOUDFLARE_KV_API_TOKEN!,
  cacheNamespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID!
});
```

It sends a Cloudflare KV REST bulk-delete request for every 10,000-key chunk and applies a 10-second
timeout to each request. It throws contextual errors for timeouts, non-success responses, malformed
responses, and later-chunk failures. It does not discover metadata, markers, or indexes, so callers
must provide every raw key that should be deleted. Prefer the Cloudflare cache driver and
`storage.clear(base)` whenever the target is a normal cache base.

## CMS and operational boundaries

Map application-domain events in the consuming application. For example, an article slug update maps
to `{ base: "kennisbank:articles", path: "/kennisbank/artikelen/<slug>" }`, then the webhook calls
this invalidation endpoint. Do not add Directus collections, event shapes, or route mapping to the
cache module.

Use `@onderwijsin/nuxt-storage-admin` for explicitly allowed storage inspection or CRUD. It is the
appropriate tool for operational browsing and controlled prefix deletion; this module is only for
metadata-aware cache drivers and targeted route invalidation.
