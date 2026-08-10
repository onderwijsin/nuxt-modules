---
name: nuxt-directus
description: Use @onderwijsin/nuxt-directus for server-safe Directus REST access in Nuxt 4.
---

# Nuxt Directus

The module is under active staged implementation. Configure a private `baseUrl` and optional
`staticToken`; only `proxy.path` and `auth.enabled` are exposed in public runtime configuration. The
default auto-imported SDK commands are `readItem` and `readItems`.

Do not place Directus credentials in public runtime configuration or client code. The proxy route is
registered at `/_directus/proxy/**` by default and forwards REST requests with server-selected
credentials. Browser requests use the proxy; server requests use a fresh direct client.

Use `useDirectus(command)` with a typed REST command such as `readItems`. Configure `commands` to
choose additional validated SDK command auto-imports, or import commands explicitly from
`@directus/sdk`. Nitro code can use `useDirectusServer(command, event?)` for direct server access.
The browser client has no static-token or authentication API.

When type generation is configured with both `baseUrl` and `typegen.introspectionToken`, import
generated interfaces from `#directus` using `import type`; the generated declaration has no runtime
exports. Consumer `typegen.rules` use generated interface/field names and fail on stale names.
Development caching is fingerprinted and is never used in CI or production. The reviewed legacy
augmentation candidates are opt-in individually; do not enable them globally without checking their
fixture behavior.

Use `useDirectusItemByPath(collection, query)` for preview-aware path/filter lookups. Normal lookups
use `readItems` with `limit: 1`; a versioned preview requires the `id` query parameter and switches
to `readItem(id, { version })`. Both return the matching item or `null`. Use
`useDirectusError(error)` to safely inspect Directus error envelopes without depending on raw SDK or
ofetch shapes.
