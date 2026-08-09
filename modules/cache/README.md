# @onderwijsin/nuxt-cache

`@onderwijsin/nuxt-cache` adds cache-entry metadata and a reverse path index to an Unstorage driver.
It also provides a protected, cache-base-scoped invalidation endpoint. It is CMS-agnostic: mapping a
content event to a cache base and public route remains the consuming application's responsibility.

Requires Nuxt 4 and Node.js 22 or later.

## Installation

```sh
pnpm add @onderwijsin/nuxt-cache unstorage
```

The driver modules below import `unstorage` directly, so it is a required application dependency.
For Redis or Valkey, also install its Unstorage peer dependency:

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

The module is disabled by default. It does not take over the application's `cache` mount. Register
the driver in the application so existing storage ownership, credentials, and deployment decisions
remain explicit.

## Cache identity and records

The cache module follows Nitro's route-rule cache identity convention. A cache base is always
`<group>:<name>`, and cache entries under that base must begin with `<group>:<name>:`. For example,
the cache identity `kennisbank:articles` owns keys such as
`kennisbank:articles:example-slug:abc123`.

For every wrapped cache value, the driver stores:

```text
value:     kennisbank:articles:<suffix>
metadata:  kennisbank:articles:<suffix>$
index:     __cache_meta:index:v1:kennisbank:articles:<encoded-path>:<encoded-key>
```

`storage.getMeta(key)` returns the native driver metadata together with the cache metadata. The
cache metadata currently contains `{ version: 1, path: "/public/route", writeId: "…" }`. `writeId`
is an internal association marker that prevents stale indexes from deleting a newer value. The
sidecar, marker, and index receive the same Unstorage options as the value, including TTL. Normal
`removeItem()` operations remove all related records.

## Driver registration

Create a Nitro driver module and reference it from `nitro.storage.cache.driver`. The cache wrapper
adds path metadata and a reverse index while preserving the underlying driver's normal operations.

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
  modules: ["@onderwijsin/nuxt-cache"],
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

Cloudflare KV bindings do not provide native bulk deletion. Use the Cloudflare-specific wrapper so
`storage.clear(base)` sends bulk-delete requests for value, metadata, and index records. The wrapper
lists only the requested base and its module-owned index prefix, deduplicates the resulting keys,
and sends Cloudflare's maximum 10,000 keys per request.

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
  modules: ["@onderwijsin/nuxt-cache"],
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

`setItems()` writes the batch with the underlying driver and then records metadata/indexes for every
cache value. Both wrappers implement a safe `clear()` for a complete cache base (or the whole cache
mount): it removes values, sidecars, association markers, and reverse indexes together. Do not call
`clear()` with a narrower arbitrary key prefix; cache-base clears must use `<group>:<name>`.

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
      "match": "prefix"
    }
  ]
}
```

`base` is required and must be `<group>:<name>`. The endpoint reads only index records for that
base; it never scans the complete `cache` mount or matches cache-key strings. `match` is `exact` by
default and also accepts `prefix`. Prefix matching includes the exact path and descendants separated
by `/`; invalidating `/articles/foo` does not invalidate `/articles/foobar`. The response is
`{ "data": { "removed": number } }`.

For prefix matching, one trailing slash is ignored: `/articles/foo/` behaves as `/articles/foo`. The
root path `/` matches every absolute cached route in the requested base.

The endpoint lazily removes stale index records when a cache value has expired or a previous write
did not complete. An invalidation request is limited by `maxInvalidatedEntries` before it deletes
any records.

Production requests require either the configured `adminHeaderName` (default `x-admin-token`) or
`Authorization: Bearer <adminToken>`. Set `devAuthBypass: true` only for a trusted local server; it
allows unauthenticated invalidation during development and logs a warning.

## Configuration

| Option                  | Default         | Description                                         |
| ----------------------- | --------------- | --------------------------------------------------- |
| `enabled`               | `false`         | Registers the invalidation API.                     |
| `adminToken`            | —               | Required production administrator token.            |
| `adminHeaderName`       | `x-admin-token` | Header carrying the administrator token.            |
| `devAuthBypass`         | `false`         | Allows unauthenticated invalidation in development. |
| `maxInvalidatedEntries` | `1000`          | Maximum index records one request can remove.       |

The module stores its private server runtime values under `runtimeConfig.nuxtCache`. This namespace
is reserved for the module; configure the public module options through the `cache` key shown above
instead of setting `runtimeConfig.nuxtCache` directly.

## Low-level Cloudflare bulk deletion

`bulkDeleteCloudflareCacheKeys(keys, credentials)` is also exported from
`@onderwijsin/nuxt-cache/runtime` for server-only maintenance code that already has fully qualified
Cloudflare KV keys. It deletes raw keys in 10,000-key chunks with a 10-second request timeout. This
is destructive and bypasses cache metadata/index discovery, so prefer `createCloudflareCacheDriver`
and `storage.clear(base)` for normal cache operations.

## Boundaries and troubleshooting

`@onderwijsin/nuxt-cache` does not implement generic cache browsing or CRUD. Use
`@onderwijsin/nuxt-storage-admin` when an operational tool needs explicitly allowlisted storage
access. It also does not translate CMS events: a consumer-owned webhook should map a CMS event to a
known cache base and public path, then call `/api/_cache/invalidate`.

Reserve `/api/_cache/**` for this module while it is enabled. If an entry has no metadata, ensure
its key begins with a valid cache base and that it was written while a Nitro request context was
active (or pass `getRequestPath` when creating the driver outside a request).
