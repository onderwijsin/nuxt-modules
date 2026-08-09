# @onderwijsin/nuxt-storage-admin

> Compatibility note: developed and tested against Node.js 24 and Nuxt 4.5.x. The package declares
> Node.js >=22 and may work with other Nuxt versions allowed by its package metadata, but versions
> outside the current CI matrix are not continuously tested; Nuxt 3 is not guaranteed.

`@onderwijsin/nuxt-storage-admin` provides administrator-only CRUD endpoints for **explicitly
allowed** Nitro storage mounts. It is intended for operational tooling, debugging, and controlled
maintenance—not as a general application data API.

Requires Nuxt 4 and Node.js 22 or later.

The module is disabled by default. It never exposes every `useStorage()` mount implicitly.

## Installation

```sh
pnpm add @onderwijsin/nuxt-storage-admin
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-storage-admin"],
  storageAdmin: {
    enabled: true,
    adminToken: process.env.STORAGE_ADMIN_TOKEN,
    internalKeyPrefixes: ["__cache_meta:"],
    internalKeySuffixes: ["$"],
    mounts: {
      cache: {
        permissions: ["read", "write", "delete"],
        prefixes: ["pages", "kennisbank:articles"]
      }
    }
  }
});
```

Import the module stylesheet from the consuming application's main CSS file:

```css
@import "@onderwijsin/nuxt-storage-admin";
```

It imports Tailwind CSS and Nuxt UI, then sources the storage browser components so their utility
classes are included. Nuxt UI is registered automatically while the development browser is enabled.

## Concepts

- A **mount** is the first argument to Nitro `useStorage()`, such as `cache`, `sessions`, or
  `uploads`.
- A **prefix** is a boundary inside a mount. For example, `kennisbank:articles` is a cache base and
  prefix inside the `cache` mount.
- A configured prefix permits that exact key and descendants separated by `:`. Configuring `pages`
  permits `pages` and `pages:home`, but not `pages-private`.

Internal records are never listed, read, written, or deleted through this API. The default patterns
hide the cache metadata index (`__cache_meta:`) and legacy cache sidecars (`$`); configure these
patterns to match the storage conventions in the consuming application.

## Configuration reference

```ts
export default defineNuxtConfig({
  storageAdmin: {
    enabled: true,
    adminToken: process.env.STORAGE_ADMIN_TOKEN,
    adminHeaderName: "x-admin-token",
    devAuthBypass: false,
    internalKeyPrefixes: ["__cache_meta:"],
    internalKeySuffixes: ["$"],
    mounts: {
      cache: {
        permissions: ["read", "write", "delete"],
        prefixes: ["pages", "kennisbank:articles"],
        allowRoot: false
      },
      operations: {
        permissions: ["read"],
        allowRoot: true
      }
    },
    ui: {
      enabled: true,
      path: "/_storage"
    },
    defaultLimit: 100,
    maxLimit: 500,
    maxListedKeys: 10_000
  }
});
```

## Authentication

In production, each API request must include either:

```http
x-admin-token: <adminToken>
```

or:

```http
Authorization: Bearer <adminToken>
```

The custom header name is configurable through `adminHeaderName`. Missing or invalid credentials
produce `401`.

Development requests require the same token by default. Set `devAuthBypass: true` only for a trusted
local server when using the browser without client-side credentials. Nuxt logs a prominent warning
when this explicit bypass is enabled; it is ignored in production builds.

## API reference

All successful responses have a `{ "data": ... }` envelope. All paths below are relative to the
application origin.

### List entries

```http
GET /api/_storage/:mount/items?prefix=<prefix>&limit=<limit>&cursor=<cursor>
```

| Query parameter | Required | Description                                                                                                          |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `prefix`        | No       | Allowed key prefix to list. Omit it to aggregate every configured prefix. A mount with no prefixes cannot be listed. |
| `limit`         | No       | Positive page size, limited by `maxLimit`.                                                                           |
| `cursor`        | No       | Cursor returned as `nextCursor` from a prior request.                                                                |
| `page`          | No       | Positive page number. Intended for the development UI; when present, it takes precedence over `cursor`.              |
| `metadata`      | No       | Set `true` to additionally retrieve raw driver metadata. `path` is always returned.                                  |
| `search`        | No       | Case-insensitive search across storage keys and `path`. Metadata is read automatically for this query.               |

Example:

```http
GET /api/_storage/cache/items?prefix=kennisbank:articles&search=example
```

```json
{
  "data": {
    "items": [
      {
        "key": "kennisbank:articles:example:abc123",
        "path": "/kennisbank/artikelen/example"
      }
    ],
    "nextCursor": null,
    "page": 1,
    "total": 1
  }
}
```

`path` is available only when the selected storage driver writes metadata. The cache module will
provide it; ordinary Unstorage drivers may return `null`. Raw driver metadata is omitted by default;
request it explicitly with `metadata=true` only when it is needed.

`nextCursor` is a storage key string, not an entry object. Use it unchanged as `cursor` in the next
request. Cursors are valid only for the same mount, prefix, search query, and ordering; writes
between requests can change the result set.

### Read an entry

```http
GET /api/_storage/:mount/items/:key
```

```json
{
  "data": {
    "key": "kennisbank:articles:example:abc123",
    "value": { "title": "Example" }
  }
}
```

### Create or replace an entry

```http
PUT /api/_storage/:mount/items/:key
Content-Type: application/json
```

```json
{ "value": { "title": "Example", "published": true } }
```

```json
{ "data": { "key": "kennisbank:articles:example:abc123", "updated": true } }
```

### Delete one entry

```http
DELETE /api/_storage/:mount/items/:key
```

```json
{ "data": { "key": "kennisbank:articles:example:abc123", "deleted": true } }
```

### Clear a prefix

```http
POST /api/_storage/:mount/actions/delete-by-prefix
Content-Type: application/json
```

```json
{ "prefix": "kennisbank:articles", "confirm": true }
```

The request is rejected when `confirm` is not literally `true` or the prefix is not permitted. It
uses Unstorage's native `clear(prefix)` operation, allowing the active driver to clear the base
efficiently and remove related internal cache records.

```json
{ "data": { "prefix": "kennisbank:articles", "cleared": true } }
```

### Clear a mount

```http
POST /api/_storage/:mount/actions/clear
Content-Type: application/json
```

```json
{ "confirm": true }
```

This removes every key in the selected mount through `storage.clear()`. It requires `delete`
permission and `allowRoot: true` on the mount; an ordinary prefix allowlist is not enough.

```json
{ "data": { "mount": "operations", "cleared": true } }
```

## Development browser

When `storageAdmin.enabled`, `storageAdmin.ui.enabled`, and `devAuthBypass` are true, `nuxt dev`
registers an unauthenticated Nuxt UI page at `ui.path` (default `/_storage`). It provides:

- a selector containing only configured mount/prefix pairs;
- key and cached-path search;
- selectable page sizes; and
- server-backed pagination; and
- per-entry and selected-entry deletion with a confirmation prompt.

The browser is not registered in production. Set `ui.enabled: false` to exclude the UI and avoid
registering `@nuxt/ui` as a module dependency.

The host application's root component must render Nuxt UI's `<UApp>` so the browser can open its
confirmation dialog and action menus.

Avoid configuring application pages at `ui.path` (default `/_storage`) or API handlers below
`/api/_storage/**`; those locations are reserved by this module while it is enabled.

## Listing limits and provider behavior

Unstorage exposes key enumeration through `getKeys()`, and not every driver can paginate or cancel
that call. Listing refuses a mount without configured prefixes and only enumerates configured bases.
`maxListedKeys` is a **post-enumeration response guard**: generic drivers have already materialized
the key array before a larger result can return `413`, so it does not cap provider or process
memory. Configure narrow prefixes and do not use this endpoint to inspect large mounts.

| Option          |  Default | Contract                                                                           |
| --------------- | -------: | ---------------------------------------------------------------------------------- |
| `maxListedKeys` | `10_000` | Maximum non-internal keys accepted after enumeration; larger results return `413`. |

Searches by `path` necessarily inspect metadata for every accepted key. Driver listing failures
return `503`; a fixed 10-second response deadline returns `504`. The deadline does not cancel an
underlying driver operation. A failed or late metadata lookup on an otherwise listable entry is
represented as `path: null`.

## Error behavior

| Status | Meaning                                                                                      |
| ------ | -------------------------------------------------------------------------------------------- |
| `400`  | Invalid route parameter, query, or body.                                                     |
| `401`  | Missing or invalid administrator token in production.                                        |
| `403`  | The configured mount, permission, prefix, or metadata key is not allowed.                    |
| `404`  | Storage administration is disabled, the mount is not configured, or an entry does not exist. |
| `413`  | The selected storage base contains more than `maxListedKeys` entries after enumeration.      |
| `503`  | The storage provider failed while listing keys.                                              |
| `504`  | The storage provider timed out while listing keys.                                           |
