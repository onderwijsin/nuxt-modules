# @onderwijsin/nuxt-directus

`@onderwijsin/nuxt-directus` provides a server-safe Directus REST foundation for Nuxt 4. The module
is being implemented incrementally; stages 1–2 establish package metadata, validated options,
private runtime configuration, and the same-origin proxy route registration.

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus"],
  directus: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN,
    proxy: { path: "/_directus/proxy" },
    commands: ["readItem", "readItems"]
  }
});
```

Directus credentials are server-only. The browser-safe runtime configuration contains only the proxy
path and whether session authentication is enabled. Directus permission rules remain the
authorization boundary. The proxy currently returns `501` while its forwarding implementation is
developed in a later plan stage.

The generated `#directus` schema and typed composables are also delivered in later stages.
