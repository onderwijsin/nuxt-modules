---
name: nuxt-storage-admin
description:
  Use when configuring @onderwijsin/nuxt-storage-admin or calling its protected Nitro storage CRUD
  API and development storage browser.
---

Use `@onderwijsin/nuxt-storage-admin` to inspect or maintain **explicitly allowed** Nitro storage
mounts. It is disabled by default and is not a general-purpose public storage API.

## Install and configure

```sh
pnpm add @onderwijsin/nuxt-storage-admin
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-storage-admin"],
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
    maxLimit: 500,
    maxScanKeys: 10_000,
    metadataConcurrency: 8,
    listTimeoutMs: 10_000
  }
});
```

In the application's main CSS file, import the module stylesheet:

```css
@import "@onderwijsin/nuxt-storage-admin";
```

This stylesheet imports Tailwind CSS and Nuxt UI, and sources the storage browser component files.

## Configuration reference

| Option                      | Default             | Contract                                                                                            |
| --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `enabled`                   | `false`             | Enables the module routes.                                                                          |
| `adminToken`                | —                   | Production token. Supply it through normal Nuxt config/environment overrides.                       |
| `adminHeaderName`           | `x-admin-token`     | Custom token header; bearer authorization is also accepted.                                         |
| `internalKeyPrefixes`       | `["__cache_meta:"]` | Prefixes reserved for internal records; matching keys are hidden from the API and UI.               |
| `internalKeySuffixes`       | `["$"]`             | Suffixes reserved for internal records; matching keys are hidden from the API and UI.               |
| `mounts`                    | `{}`                | Map of allowed `useStorage()` mount names.                                                          |
| `mounts.<name>.permissions` | —                   | One or more of `read`, `write`, `delete`.                                                           |
| `mounts.<name>.prefixes`    | `[]`                | Allowed keys/prefixes. Required unless `allowRoot` is true.                                         |
| `mounts.<name>.allowRoot`   | `false`             | Allows empty-prefix access to the whole mount. Use sparingly.                                       |
| `ui.enabled`                | `true`              | Enables the development-only browser. When false, Nuxt UI is not registered as a module dependency. |
| `ui.path`                   | `/_storage`         | Development-only browser path; must start with `/`.                                                 |
| `defaultLimit`              | `100`               | Default list page size; maximum `500`.                                                              |
| `maxLimit`                  | `500`               | Largest allowed list `limit`; maximum `1000`.                                                       |
| `maxScanKeys`               | `10_000`            | Maximum non-internal keys scanned per list request; larger selections return `413`.                 |
| `metadataConcurrency`       | `8`                 | Maximum simultaneous driver listing/metadata calls; maximum `50`.                                   |
| `listTimeoutMs`             | `10_000`            | Per-driver-call list/metadata timeout in milliseconds; `100`–`60_000`.                              |

A mount is a Nitro namespace, for example `useStorage("cache")`. A prefix is a boundary inside that
mount: `kennisbank:articles` is a cache base/prefix inside the `cache` mount. Configure the
narrowest prefixes possible. The default internal patterns hide `__cache_meta:` cache indexes and
`$` sidecars; override them when the consuming application uses different internal key conventions.

## Authentication

Production API calls require one of:

```http
x-admin-token: <adminToken>
```

```http
Authorization: Bearer <adminToken>
```

Development bypasses this check for local operations and the development browser. The bypass and
browser are not registered in production builds.

## API reference

All success payloads have a `{ "data": ... }` envelope.

### List entries

```http
GET /api/_storage/:mount/items?prefix=<prefix>&limit=<limit>&cursor=<cursor>
```

Parameters:

- `prefix`: optional configured prefix. Omit it to aggregate all configured prefixes, or every key
  when the mount has `allowRoot: true`.
- `limit`: optional positive page size, capped by `maxLimit`.
- `cursor`: optional continuation token returned in `nextCursor`.
- `page`: optional positive page number; intended for the development browser and takes precedence
  over `cursor`.
- `metadata=true`: includes the driver metadata and normalized `path` field.
- `search=<text>`: case-insensitive search of storage keys and `metadata.path`.

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

Path search works when the chosen driver exposes `getMeta()` with a `path` field. The cache module
will provide this; a normal storage driver may return `null` for `path`.

`nextCursor` is the final entry's string key. Send that exact value as `cursor`; do not serialize
the whole entry. It is valid only for the same mount, prefix, search text, and ordering, and writes
between pages can change the result set.

### Read one entry

```http
GET /api/_storage/:mount/items/:key
```

Returns `{ "data": { "key": "…", "value": <stored-value> } }`.

### Create or replace one entry

```http
PUT /api/_storage/:mount/items/:key
Content-Type: application/json

{ "value": { "example": true } }
```

Returns `{ "data": { "key": "…", "updated": true } }`.

### Delete one entry

```http
DELETE /api/_storage/:mount/items/:key
```

Returns `{ "data": { "key": "…", "deleted": true } }`.

### Clear a prefix

```http
POST /api/_storage/:mount/actions/delete-by-prefix
Content-Type: application/json

{ "prefix": "kennisbank:articles", "confirm": true }
```

`confirm` must be literally `true`. The module uses native `storage.clear(prefix)` so the active
driver can clear the base efficiently. Returns `{ "data": { "prefix": "…", "cleared": true } }`.

### Clear a mount

```http
POST /api/_storage/:mount/actions/clear
Content-Type: application/json

{ "confirm": true }
```

This calls `storage.clear()` for the entire mount. It requires `delete` permission and
`allowRoot: true`; a prefix allowlist alone is insufficient. Returns
`{ "data": { "mount": "…", "cleared": true } }`.

## Development browser

With `storageAdmin.enabled` and `storageAdmin.ui.enabled` enabled, open `ui.path` (default
`/_storage`) while running `nuxt dev`. The browser lists only configured mount/prefix pairs,
searches storage keys and cache paths, and provides pagination, page-size controls, and confirmed
per-entry or selected-entry deletion.

Set `storageAdmin.ui.enabled` to `false` to remove the page and prevent the module from registering
`@nuxt/ui` as a Nuxt dependency.

The host app must use Nuxt UI's `<UApp>` root wrapper for the browser's confirmation dialog and
action menus.

## Errors and safety

- `400`: invalid request input.
- `401`: missing or invalid production token.
- `403`: unpermitted mount operation, prefix, or metadata key.
- `404`: disabled/unconfigured mount or absent entry.
- `413`: the selected base exceeds `maxScanKeys`.
- `503`: the storage provider failed while listing keys.
- `504`: a storage key listing timed out.

Never configure `allowRoot: true` for sensitive mounts unless full administrative access is
intended.

## Operations and troubleshooting

The module requires Nuxt 4 and Node.js 22 or later. It reserves `/api/_storage/**` while enabled and
reserves `ui.path` (default `/_storage`) in development; do not use those paths for application
routes.

Unstorage does not provide paginated `getKeys()` for every driver. The module caps the scanned
result set and bounds metadata concurrency, but a path search still reads metadata for every key up
to `maxScanKeys`. Size configured prefixes narrowly and tune `maxScanKeys`, `metadataConcurrency`,
and `listTimeoutMs` for the provider. Provider list failures return `503`; list timeouts return
`504`; unavailable or timed-out per-entry metadata is returned as `path: null`.

If the browser does not render dialogs or action menus, ensure the consuming app has `<UApp>` at its
root and imports `@onderwijsin/nuxt-storage-admin` from its main CSS file. To verify the published
artifact, run `pnpm pack` from the module, install that tarball in a clean Nuxt 4 app, then run
`pnpm nuxt prepare` and `pnpm nuxt build`.
