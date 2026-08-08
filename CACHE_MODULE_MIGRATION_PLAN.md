# Cache module migration plan

## Goal

Migrate the copied local cache module into publishable Nuxt modules while removing consumer-app and
Directus coupling. The resulting design must preserve efficient, targeted cache invalidation and
support Node server and Cloudflare Workers runtimes.

The legacy module currently combines three concerns:

1. Admin endpoints for inspecting and mutating Nitro storage.
2. Cache storage drivers that attach request-path metadata to cache entries.
3. A Directus-shaped flush endpoint that maps collections to cache keys and routes through
   `cacheMap`.

The migration will split those concerns into two modules:

- `@onderwijsin/nuxt-storage-admin`: protected administration of explicitly configured Nitro storage
  mounts.
- `@onderwijsin/nuxt-cache`: cache-driver metadata, cache indexing, and generic base-scoped cache
  invalidation.

Directus event translation remains a consumer concern initially. It may become a separate optional
adapter module later, but must not be part of the cache core.

## Terminology

Nitro storage has two relevant scopes:

| Term          | Example                        | Meaning                                                                     |
| ------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Storage mount | `cache`                        | The top-level namespace selected with `useStorage('cache')`.                |
| Cache base    | `kennisbank:articles`          | A key prefix inside the `cache` mount, formed from route-rule `group:name`. |
| Cache entry   | `kennisbank:articles:<suffix>` | A concrete key created by Nitro under a base.                               |

Therefore, a storage mount is not a cache base. The storage-admin module selects a mount; its prefix
input can select a base or a narrower subset of keys within that mount.

## Cache identity contract

Keep the existing route-rule cache identity convention. It is both meaningful to consumers and an
efficient invalidation partition:

```ts
routeRules: {
  '/kennisbank/artikelen/**': {
    cache: {
      group: 'kennisbank',
      name: 'articles',
      swr: true,
      maxAge: 60
    }
  }
}
```

The normalized cache base is always:

```text
<group>:<name>
```

For the example above, it is `kennisbank:articles`. The cache module should validate the identity
format at its public boundaries and normalize it once. The underlying emitted Nitro cache-key format
must be verified for every supported Nuxt/Nitro mode before this becomes a release contract.

## `@onderwijsin/nuxt-storage-admin`

### Purpose and security model

Provide admin-only storage CRUD for mounts that the application explicitly allowlists. It must not
expose unrestricted access to every mounted storage driver, the default storage mount, or internal
cache metadata records.

Configuration will define:

- an `enabled` flag;
- an administrator token and configurable token-header name;
- permitted mounts;
- per-mount read, write, and delete permissions;
- list-size limits; and
- optional permitted key-prefix limits per mount.

The module will use `isAdmin` from `@onderwijsin/nuxt-module-utils/server`, validate all request
input with Zod, and return its own documented response contract. It will not depend on an
application-local `useApiResponse` or `~~/server/...` import.

### API design

The mount belongs in the route. The cache base is represented by a validated `prefix` parameter; it
is not a route parameter required by the generic CRUD API.

```text
GET    /api/_storage/:mount/items?prefix=<prefix>&cursor=<cursor>&limit=<limit>
GET    /api/_storage/:mount/items/:key
PUT    /api/_storage/:mount/items/:key
DELETE /api/_storage/:mount/items/:key
POST   /api/_storage/:mount/actions/delete-by-prefix
```

Examples for the `cache` mount:

```text
GET  /api/_storage/cache/items?prefix=kennisbank:articles
POST /api/_storage/cache/actions/delete-by-prefix
```

```json
{ "prefix": "kennisbank:articles" }
```

The prefix is optional only for a mount where full listing or full deletion is explicitly allowed.
Full deletion must be a distinct, documented destructive action, never an accidental result of an
empty prefix. A cursor is an API-level continuation token; drivers without native pagination may
still enumerate internally, but the response remains bounded by `limit`.

The module will offer true CRUD. The legacy cache routes only list, read, and delete/clear; they do
not implement create or update.

## `@onderwijsin/nuxt-cache`

### Responsibilities

- Provide a driver-agnostic metadata wrapper for Unstorage drivers.
- Initially provide filesystem, Redis/Valkey, and Cloudflare KV-binding convenience adapters.
- Maintain entry metadata and a reverse path index.
- Offer generic, authenticated cache invalidation scoped to a required cache base.
- Handle Cloudflare KV bulk deletion, including every internal metadata/index record.
- Expose an optional server runtime helper for in-process invalidation.

It will not provide generic storage CRUD and will not understand Directus collections, events,
fields, `cacheMap`, `fieldKey`, or `pathPrefix`.

### Metadata and index

Each cached value receives a sidecar metadata record and a path-index record. The metadata is for
inspection; the index is the efficient invalidation lookup.

Conceptually:

```text
value:     kennisbank:articles:<cache-key>
metadata:  kennisbank:articles:<cache-key>$
index:     __cache_meta:index:v1:kennisbank:articles:<encoded-path>:<encoded-cache-key>
```

Metadata has a versioned, extensible shape and records the normalized request path. Index records
are one record per cache-entry/path association, rather than one mutable path-to-array document.
This avoids cross-runtime read-modify-write races and works with drivers that only provide ordinary
Unstorage key operations.

The driver passes compatible TTL/options to the value, metadata, and index records. Normal driver
deletion removes all related records. The invalidation path must tolerate and lazily clean up stale
index records caused by expiry or interrupted writes.

### Generic invalidation API

```text
POST /api/_cache/invalidate
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

`base` is required and is the primary performance boundary. The endpoint queries only index records
for that base and path, retrieves the concrete cache keys, and removes each value, metadata, and
index record. It does not scan the entire `cache` mount or fall back to cache-key string matching.

`match` supports `exact` and `prefix`. A target without `path` may be supported only as an explicit
base-wide invalidation operation; it must be documented as destructive and guarded by the same
limits/authorization rules as a storage-admin bulk delete.

The public input may later accept `{ group, name }` as a convenience, but it will normalize to the
same required base string before lookup.

### Directus integration boundary

Directus sends application-domain events; the cache module receives cache-domain targets. A
consumer-owned webhook handler or future optional Directus adapter transforms:

```text
collection + changed item fields -> cache base + concrete route path
```

For example:

```text
articles + slug "example-slug"
  -> base "kennisbank:articles"
  -> path "/kennisbank/artikelen/example-slug"
```

This replaces `cacheMap` without losing the mapping. The mapping remains necessary because no
generic cache module can infer a public route from a CMS collection and fields. Keeping it out of
the cache core makes the cache package CMS-agnostic and lets applications own their routing rules.

## Unstorage driver strategy

The core wrapper will accept an Unstorage `Driver`, so its metadata/index behavior is independent of
a backend. The package will not bundle every Unstorage driver.

Initial provider adapters cover the currently supported deployment paths:

- filesystem for development;
- Redis/Valkey for Node server;
- Cloudflare KV binding for Cloudflare Workers.

To support another driver, an application supplies a small driver module that creates its chosen
Unstorage driver and wraps it with the cache module's documented public runtime helper. This design
allows eventual support for all Unstorage drivers without imposing all driver dependencies or
Node-only code on every cache-module consumer.

## Package migration plan

1. Inventory legacy behavior and existing consumers of `/api/_cache/*`; record which compatibility
   endpoints, if any, require a temporary adapter.
2. Create `modules/storage-admin` in the standard publishable package layout, with module
   entrypoint, config validation, runtime handlers, public types, tests, playground, README,
   changelog, and consumer skill.
3. Rebuild `modules/cache` in the same package layout. Keep `src/module.ts` orchestration-only;
   locate build-time validation/configuration in `src/config`, runtime behavior in `src/runtime`,
   and public types in `src/types`.
4. Replace all consumer-local aliases, `@config/modules`, `varlock`, environment reads, and
   application-local security/response helpers with explicit Nuxt/Nitro/H3 imports and published
   module utility imports.
5. Implement the metadata/index wrapper and base-scoped invalidation before porting provider
   adapters. Verify cache key/base behavior with a focused Nuxt/Nitro integration test.
6. Add a consumer-owned Directus webhook example that transforms the legacy event payload into the
   new invalidate request. Do not include it in the cache module runtime.
7. Decide whether to ship a temporary deprecated `/api/_cache/flush` compatibility adapter. If it
   exists, make it opt-in, document its removal path, and keep it outside the core invalidation
   implementation.
8. Update root module documentation, package READMEs, consumer skills, changesets, and validate
   packed tarballs. Run formatting, lint fixes, type checks, unit tests, builds, and package
   validation before release.

## Required test coverage

- Module setup, disabled behavior, runtime config/type template generation, and handler
  registration.
- Storage-admin mount allowlisting, permission checks, key/prefix validation, bounded listing, and
  destructive-action safeguards.
- Cache base normalization and validation.
- Exact and prefix invalidation scoped to one base.
- No cross-base cache deletion for identical paths.
- Metadata/index write, overwrite, expiry alignment, normal deletion, and stale-index recovery.
- Filesystem, Redis/Valkey, and Cloudflare KV behavior, including Cloudflare bulk deletion of all
  associated records.
- Nuxt integration coverage for actual route-rule cache identities and generated runtime output.
