---
name: nuxt-webmanifest
description:
  Use when integrating or extending @onderwijsin/nuxt-webmanifest in a Nuxt 4 application. It covers
  zero-config manifest generation, Site Config and Schema.org metadata, and icon providers.
---

# Nuxt Webmanifest

Use `@onderwijsin/nuxt-webmanifest` to generate and publish `/app.webmanifest` automatically.

```sh
pnpm add @onderwijsin/nuxt-webmanifest
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-webmanifest"]
});
```

The module registers `@nuxt/image`, `nuxt-site-config`, and `nuxt-schema-org` as module
dependencies. It derives `name`, `short_name`, and `categories` from `schemaOrg.identity`, and
`name`/`description` from the global `site` configuration. Multi-tenancy is not supported.

Set icon sources and explicit manifest values under `webmanifest`. Supplying `manifest.icons`
bypasses automatic icon generation:

```ts
export default defineNuxtConfig({
  webmanifest: {
    icons: {
      favicon: "/icons/favicon",
      appIcon: "/icons/app",
      maskableAppIcon: "/icons/maskable"
    },
    manifest: {
      theme_color: "#0f766e",
      icons: [{ src: "/brand-icon.png", sizes: "512x512", type: "image/png" }]
    }
  }
});
```

With `image.provider: "ipx"`, the module emits Nuxt Image IPX URLs. For Cloudinary, it uses
`image.cloudinary.baseURL`. The module never reads environment variables directly.
