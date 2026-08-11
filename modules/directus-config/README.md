# @onderwijsin/nuxt-directus-config

Shared, typed configuration for related Directus Nuxt modules. It discovers `directus.config.ts` in
the application root and exposes it as the `#directus-config` virtual module. It deliberately does
not configure `@onderwijsin/nuxt-directus` yet; integration will be additive in a later release.

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus-config
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config"]
});
```

## `directus.config.ts`

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: { preview: {} }
});
```

`instance.baseUrl` is optional. Directus modules that require an instance must validate that
requirement in their own composed module configuration.

Set `directusConfig.configFile` to a root-relative or absolute alternative, or `false` to disable
discovery. A missing default file is valid.

## Compatibility

Requires Nuxt 4 and Node.js 22 or newer.
