# @onderwijsin/nuxt-storage-admin

`@onderwijsin/nuxt-storage-admin` provides administrator-only CRUD endpoints for **explicitly
allowed** Nitro storage mounts. It is intended for operational tooling, debugging, and controlled
maintenance—not as a general application data API.

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
    maxLimit: 500
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

Development requests intentionally bypass this token check to support the local browser. This bypass
is removed from production builds; do not expose a development server publicly.

## API reference

All successful responses have a `{ "data": ... }` envelope. All paths below are relative to the
application origin.

### List entries

```http
GET /api/_storage/:mount/items?prefix=<prefix>&limit=<limit>&cursor=<cursor>
```

| Query parameter | Required | Description                                                                                                      |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `prefix`        | No       | Allowed key prefix to list. Omit it to aggregate every configured prefix, or every key when `allowRoot` is true. |
| `limit`         | No       | Positive page size, limited by `maxLimit`.                                                                       |
| `cursor`        | No       | Cursor returned as `nextCursor` from a prior request.                                                            |
| `page`          | No       | Positive page number. Intended for the development UI; when present, it takes precedence over `cursor`.          |
| `metadata`      | No       | Set `true` to retrieve driver metadata and `path`.                                                               |
| `search`        | No       | Case-insensitive search across storage keys and `metadata.path`. Metadata is read automatically for this query.  |

Example:

```http
GET /api/_storage/cache/items?prefix=kennisbank:articles&metadata=true&search=example
```

```json
{
  "data": {
    "items": [
      {
        "key": "kennisbank:articles:example:abc123",
        "metadata": { "path": "/kennisbank/artikelen/example" },
        "path": "/kennisbank/artikelen/example"
      }
    ],
    "nextCursor": null,
    "page": 1,
    "total": 1
  }
}
```

`metadata.path` is available only when the selected storage driver writes metadata. The cache module
will provide it; ordinary Unstorage drivers may return `null`.

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

When both `storageAdmin.enabled` and `storageAdmin.ui.enabled` are true, `nuxt dev` registers a Nuxt
UI page at `ui.path` (default `/_storage`). It provides:

- a selector containing only configured mount/prefix pairs;
- key and `metadata.path` search;
- selectable page sizes; and
- server-backed pagination; and
- per-entry and selected-entry deletion with a confirmation prompt.

The browser is not registered in production. Set `ui.enabled: false` to exclude the UI and avoid
registering `@nuxt/ui` as a module dependency.

The host application's root component must render Nuxt UI's `<UApp>` so the browser can open its
confirmation dialog and action menus.

## Error behavior

| Status | Meaning                                                                                      |
| ------ | -------------------------------------------------------------------------------------------- |
| `400`  | Invalid route parameter, query, or body.                                                     |
| `401`  | Missing or invalid administrator token in production.                                        |
| `403`  | The configured mount, permission, prefix, or metadata key is not allowed.                    |
| `404`  | Storage administration is disabled, the mount is not configured, or an entry does not exist. |
