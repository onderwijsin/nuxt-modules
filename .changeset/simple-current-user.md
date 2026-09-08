---
"@onderwijsin/nuxt-directus-client": minor
---

Simplify current-user fetching around the configured fields and optional server-side mapper. The
composable now uses one route in browser and SSR, preserves rotated SSR session cookies, and
removes generated current-user types and the injected SSR transport.
