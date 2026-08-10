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
