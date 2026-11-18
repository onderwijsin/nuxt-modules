---
"@onderwijsin/nuxt-theme-customizer": patch
---

Import clipboard and debounced font-search helpers directly from `@vueuse/core` and stop installing or registering `@vueuse/nuxt`. Applications can use VueUse Nuxt 15 without the customizer rejecting its version, or omit the integration entirely. Applications that relied on the customizer to provide VueUse auto-imports must install and register their own `@vueuse/nuxt`.
