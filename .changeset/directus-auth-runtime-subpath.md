---
"@onderwijsin/nuxt-directus-client": patch
---

Fix a server-runtime startup failure by resolving Directus configuration from the current H3 event
instead of importing Nitro's runtime barrel. This prevents generated Nitro virtual dependencies from
being loaded into application runtime code while keeping SSR authentication independent of ambient
Nuxt composable context.
