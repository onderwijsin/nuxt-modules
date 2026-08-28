---
"@onderwijsin/nuxt-directus-client": patch
---

Fix SSR authentication from asynchronous Nuxt page middleware by resolving server runtime
configuration through the current Nitro request event instead of relying on ambient Nuxt composable
context. Consumers no longer need to wrap `useDirectusAuth()` calls in `runWithContext()`.
