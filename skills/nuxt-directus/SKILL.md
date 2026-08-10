---
name: nuxt-directus
description: Use @onderwijsin/nuxt-directus for server-safe Directus REST access in Nuxt 4.
---

# Nuxt Directus

The module is under active staged implementation. In stages 1–2, configure a private `baseUrl` and
optional `staticToken`; only `proxy.path` and `auth.enabled` are exposed in public runtime
configuration. The default auto-imported SDK commands are `readItem` and `readItems`.

Do not place Directus credentials in public runtime configuration or client code. The proxy route is
registered at `/_directus/proxy/**` by default and currently returns `501` until the forwarding
stage is complete.

When type generation is configured with both `baseUrl` and `typegen.introspectionToken`, import
generated interfaces from `#directus` using `import type`; the generated declaration has no runtime
exports. Consumer `typegen.rules` use generated interface/field names and fail on stale names.
Development caching is fingerprinted and is never used in CI or production. The reviewed legacy
augmentation candidates are opt-in individually; do not enable them globally without checking their
fixture behavior.
