---
name: nuxt-directus-config
description:
  Configure shared executable Directus instance, client, collection, and sitemap settings with
  @onderwijsin/nuxt-directus-config for Nuxt 4.
---

# Nuxt Directus Config

Use `@onderwijsin/nuxt-directus-config` to centralize executable Directus configuration in
`directus.config.ts`. Install and register it before consuming Directus modules. It is optional:
direct module options remain supported and override shared configuration, including nested values.

```sh
pnpm add @onderwijsin/nuxt-directus-config
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus-client"]
});
```

## Configuration source

Create `directus.config.ts` in the Nuxt root. It is executable TypeScript: use it for secrets,
functions, and other values that must not be serialised through `nuxt.config.ts`.

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
    nuxtBaseUrl: "https://app.example.com",
    proxy: { path: "/_directus/proxy" },
    commands: ["readItem", "readItems"],
    preview: {
      enabled: true,
      versioning: true,
      queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
    },
    auth: {
      enabled: true,
      turnstile: { enabled: true },
      cookie: {
        name: "directus_session",
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 2592000
      },
      refreshSafetyWindow: 30000,
      sessionSecret: process.env.DIRECTUS_SESSION_SECRET,
      previousSessionSecrets: process.env.DIRECTUS_PREVIOUS_SESSION_SECRETS?.split(",") ?? [],
      maskSecretsInPlayground: true,
      passwordResetUrl: "https://app.example.com/reset-password"
    },
    typegen: {
      enabled: true,
      introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN,
      cache: { maxAge: 3600000 },
      augmentations: {
        removeEnums: true,
        replaceAnyWithUnknown: true,
        replaceJsonWithJSON: true,
        applyTypeNameOverrides: true,
        makeNonNullableOptionalsRequired: true,
        mergeJsDocs: true
      },
      rules: { articles: { body: "RichText" } },
      transform: (source) => source
    }
  },
  collections: [
    {
      collection: "articles",
      sitemap: {
        _sitemap: "articles",
        filter: { status: { _eq: "published" } },
        mapper: () => ({ loc: "/articles" })
      },
      prerender: false
    }
  ],
  sitemaps: {
    static: [{ loc: "/" }],
    apiEndpoint: "/api/_directus-sitemaps/urls",
    sitemapsPathPrefix: "/__sitemap__/",
    enablePrettyUrls: true,
    cache: { maxAge: 300, staleMaxAge: 0, swr: true },
    prerenderSitemaps: false
  }
});
```

## Complete option reference

For authentication, cookies, sealing, and secret rotation details, read the
[`@onderwijsin/nuxt-directus-client` Authentication documentation](../../modules/directus-client/README.md#authentication).
Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

For the complete configuration tables, collection/sitemap contracts, and sitemap-entry schemas, read
[references/configuration/options.md](references/configuration/options.md) before changing shared
configuration or sitemap behavior.

## Nuxt module options and discovery

Configure this module under `directusConfig`:

```ts
export default defineNuxtConfig({
  directusConfig: {
    enabled: true,
    configFile: "config/directus.ts"
  }
});
```

`configFile` can be root-relative or absolute. Set it to `false` to disable discovery. A missing
default `directus.config.ts` is valid and resolves to empty shared configuration. When a config
source is discovered, its path is added to Nuxt's generated Node TypeScript project so ambient
declarations from tools such as Varlock remain available in IDEs.

| Prop name                   | Data type                   | Required | Description                                                                                              |
| --------------------------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `directusConfig.enabled`    | `boolean`                   | No       | Defaults to `true`; enables discovery and virtual-module generation.                                     |
| `directusConfig.configFile` | non-empty `string \| false` | No       | Defaults to `directus.config.ts`; use a root-relative or absolute path, or `false` to disable discovery. |

## Public API and virtual aliases

`@onderwijsin/nuxt-directus-config/config` exports:

- `defineDirectusConfig(config)` — typed identity helper for a strict config source.
- `validateDirectusConfig(value)` — runtime validation returning `ResolvedDirectusConfig`.
- `getResolvedDirectusConfigFromSource(rootDir, configFile)` — loads and validates a source for
  dependent module dependency discovery.
- `DirectusConfig` and `ResolvedDirectusConfig` types.

`@onderwijsin/nuxt-directus-config/schema` exports the config, instance, client, typegen, command,
and public-projection schemas; inferred public option types; `supportedDirectusCommands`;
`TypegenTransform` and `TypegenTransformContext`; `getPublicSchema`; and resolved-config helpers.

The module creates two virtual aliases:

- `#directus-config`: safe in browser, app, and server code. Its default export is a sanitized
  projection containing only public proxy, preview, and authentication-enabled settings.
- `#directus-config-server`: Nitro-server-only. Its default export is the full
  `ResolvedDirectusConfig`, including secrets and executable functions.

```ts
// server/api/example.get.ts
import directusConfig from "#directus-config-server";
```

Never import `#directus-config-server` from browser code. Do not write a parallel sanitizer:
`.sensitive()` annotations on the schemas drive the safe `#directus-config` projection.

Requires Nuxt 4 and Node.js 24 or newer. Node.js 22 may work but is untested and unsupported.
