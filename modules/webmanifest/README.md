# @onderwijsin/nuxt-webmanifest

Generate a rich `app.webmanifest` with zero configuration for Nuxt 4 applications.

## Purpose

- Provide a stable web manifest output for production deployments.
- Build manifest values from Site Config and Schema.org identity metadata.
- Generate icons through Cloudinary or Nuxt Image's IPX provider.

## Behavior

- Disabled in dev mode.
- Generates the manifest into build templates and exposes it as a public asset.
- Adds `<link rel="manifest" href="/app.webmanifest">`.
- Explicit `manifest.icons` bypasses automatic icon generation.
- Automatically registers `@nuxt/image`, `nuxt-site-config`, and `nuxt-schema-org` as module
  dependencies.

## Configuration

Install and register the module:

```sh
pnpm add @onderwijsin/nuxt-webmanifest
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-webmanifest"]
});
```

The module uses `site.name`, `site.description`, and `schemaOrg.identity` when available. Icon
sources are module options, never environment variables. Set `webmanifest.manifest` fields and icon
sources in `nuxt.config.ts`:

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

When `image.provider` is `"ipx"`, the module generates `/_ipx`-style manifest URLs. For
`cloudinary`, it uses Nuxt Image's `image.cloudinary.baseURL`.

If `favicon` or `appIcon` is missing, the other is used as a fallback. If both are missing,
`maskableAppIcon` is used for both. A missing maskable icon only omits maskable entries. Unsupported
providers or missing icon sources produce a warning and skip automatic icon generation.

## Notes

- The module does not support multi-tenant Site Config values; it uses the global `site` config.
