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
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus"]
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
  collections: {
    collections: [
      {
        collection: "articles",
        sitemap: {
          _sitemap: "articles",
          filter: { status: { _eq: "published" } },
          mapper: () => ({ path: "/articles" })
        },
        prerender: false
      }
    ]
  },
  sitemaps: {
    static: [{ loc: "/" }],
    apiEndpoint: "/api/_directus-sitemaps/urls",
    enablePrettyUrls: true,
    cache: { maxAge: 300, staleMaxAge: 0, swr: true },
    prerenderSitemaps: false
  }
});
```

## Complete option reference

All top-level properties are optional. The source schema is strict unless an option explicitly
accepts arbitrary filter or static-entry fields. Sensitive fields are omitted from
`#directus-config`.

| Prop name                                                       | Data type                                                      | Required                      | Description                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `instance`                                                      | `object`                                                       | No                            | Shared Directus instance credentials. Sensitive.                                                                       |
| `instance.baseUrl`                                              | URL string                                                     | No                            | Directus URL. Consumers that make requests require it. Sensitive.                                                      |
| `instance.staticToken`                                          | `string`                                                       | No                            | Static server-only credential. Sensitive.                                                                              |
| `client`                                                        | `object`                                                       | No                            | Directus SDK client settings.                                                                                          |
| `client.proxy`                                                  | `object`                                                       | No                            | Browser proxy settings.                                                                                                |
| `client.proxy.path`                                             | local absolute path string                                     | No                            | Defaults to `/_directus/proxy`; cannot be root, contain traversal segments, or overlap `/_directus/auth`.              |
| `client.commands`                                               | `DirectusCommand[]`                                            | No                            | Defaults to `readItem`, `readItems`; allowed values are `supportedDirectusCommands`. Sensitive.                        |
| `client.preview`                                                | `object`                                                       | No                            | Version-preview settings.                                                                                              |
| `client.preview.enabled`                                        | `boolean`                                                      | No                            | Defaults to `true`; enables preview query parsing.                                                                     |
| `client.preview.versioning`                                     | `boolean`                                                      | No                            | Defaults to `true`; enables Content Version lookup.                                                                    |
| `client.preview.queryKeys`                                      | `object`                                                       | No                            | Preview query parameter names.                                                                                         |
| `client.preview.queryKeys.preview`                              | non-empty `string`                                             | No                            | Defaults to `preview`.                                                                                                 |
| `client.preview.queryKeys.token`                                | non-empty `string`                                             | No                            | Defaults to `token`.                                                                                                   |
| `client.preview.queryKeys.version`                              | non-empty `string`                                             | No                            | Defaults to `version`.                                                                                                 |
| `client.preview.queryKeys.id`                                   | non-empty `string`                                             | No                            | Defaults to `id`.                                                                                                      |
| `client.auth`                                                   | `object`                                                       | No                            | Cookie-backed authentication settings.                                                                                 |
| `client.auth.enabled`                                           | `boolean`                                                      | No                            | Defaults to `false`; enables authentication routes.                                                                    |
| `client.auth.turnstile`                                         | `object`                                                       | No                            | Turnstile authentication protection.                                                                                   |
| `client.auth.turnstile.enabled`                                 | `boolean`                                                      | No                            | Defaults to `false`.                                                                                                   |
| `client.auth.cookie`                                            | `object`                                                       | No                            | Cookie settings; the complete object is sensitive.                                                                     |
| `client.auth.cookie.name`                                       | `/^[A-Za-z0-9_-]+$/` string                                    | No                            | Defaults to `directus_session`.                                                                                        |
| `client.auth.cookie.secure`                                     | `boolean`                                                      | No                            | Defaults to `true`.                                                                                                    |
| `client.auth.cookie.sameSite`                                   | `"lax" \| "strict" \| "none"`                                  | No                            | Defaults to `lax`.                                                                                                     |
| `client.auth.cookie.path`                                       | local absolute path string                                     | No                            | Defaults to `/`.                                                                                                       |
| `client.auth.cookie.maxAge`                                     | positive integer                                               | No                            | Defaults to `2592000` seconds.                                                                                         |
| `client.auth.cookie.domain`                                     | non-empty `string`                                             | No                            | Optional cookie domain.                                                                                                |
| `client.auth.refreshSafetyWindow`                               | non-negative integer                                           | No                            | Defaults to `30000` milliseconds. Sensitive.                                                                           |
| `client.auth.passwordResetUrl`                                  | URL string                                                     | No                            | Directus password-reset destination. Sensitive.                                                                        |
| `client.typegen`                                                | `object`                                                       | No                            | Schema type-generation settings. Sensitive.                                                                            |
| `client.typegen.enabled`                                        | `boolean`                                                      | No                            | Defaults to `true`.                                                                                                    |
| `client.typegen.introspectionToken`                             | `string`                                                       | No                            | Server-only schema-introspection credential.                                                                           |
| `client.typegen.cache`                                          | `object`                                                       | No                            | Development type-generation cache settings.                                                                            |
| `client.typegen.cache.maxAge`                                   | non-negative integer                                           | No                            | Defaults to `3600000` milliseconds.                                                                                    |
| `client.typegen.augmentations`                                  | `object`                                                       | No                            | Generated-source transforms; every flag defaults to `true`.                                                            |
| `client.typegen.augmentations.removeEnums`                      | `boolean`                                                      | No                            | Removes generated enum declarations.                                                                                   |
| `client.typegen.augmentations.replaceAnyWithUnknown`            | `boolean`                                                      | No                            | Replaces generated `any` values with `unknown`.                                                                        |
| `client.typegen.augmentations.replaceJsonWithJSON`              | `boolean`                                                      | No                            | Replaces quoted JSON field types.                                                                                      |
| `client.typegen.augmentations.applyTypeNameOverrides`           | `boolean`                                                      | No                            | Applies reviewed generated type-name corrections.                                                                      |
| `client.typegen.augmentations.makeNonNullableOptionalsRequired` | `boolean`                                                      | No                            | Makes eligible optional fields required.                                                                               |
| `client.typegen.augmentations.mergeJsDocs`                      | `boolean`                                                      | No                            | Merges adjacent generated JSDoc blocks.                                                                                |
| `client.typegen.rules`                                          | `Record<collection, Record<field, typeExpression>>`            | No                            | Defaults to `{}`; type expressions must be non-empty, single-line strings without semicolons.                          |
| `client.typegen.transform`                                      | `(source, context) => string`                                  | No                            | Final executable transform. `context` has `directusUrl`, `generatorVersion`, `collections`, and `rules`.               |
| `collections`                                                   | `{ collections: DirectusCollectionConfig[] }`                  | No                            | Shared portable collection behaviour. Entirely sensitive.                                                              |
| `collections.collections`                                       | `DirectusCollectionConfig[]`                                   | No                            | Defaults to `[]`.                                                                                                      |
| `collections.collections[].collection`                          | non-empty `string`                                             | Yes                           | Directus collection name.                                                                                              |
| `collections.collections[].sitemap`                             | `false \| object`                                              | Yes                           | `false` excludes the collection; otherwise configures sitemap data.                                                    |
| `collections.collections[].sitemap._sitemap`                    | non-empty `string`                                             | No                            | Named `@nuxtjs/sitemap` destination for mapped collection URLs.                                                        |
| `collections.collections[].sitemap.fields`                      | non-empty `string[]`                                           | No                            | Fields passed to the default Directus fetch.                                                                           |
| `collections.collections[].sitemap.filter`                      | `Record<string, unknown>`                                      | No                            | Directus filter passed to the default fetcher.                                                                         |
| `collections.collections[].sitemap.fetcher`                     | `({ collection, fields, filter }) => Promise<readonly Item[]>` | No                            | Replaces the default fetcher; mapper still runs on its result.                                                         |
| `collections.collections[].sitemap.mapper`                      | `(item) => entry \| entry[] \| null \| undefined`              | Yes when `sitemap` is enabled | Maps fetched items to sitemap entries.                                                                                 |
| `collections.collections[].prerender`                           | `false \| {}`                                                  | Yes                           | Reserved configuration for the future prerender module.                                                                |
| `collections.collections[].sitemap.mapper` result               | `{ path, lastUpdated?, noIndex?, priority? }`                  | —                             | `path` begins with `/`; `lastUpdated` is a string; `noIndex` is boolean; `priority` is `0` through `1` in `0.1` steps. |
| `sitemaps`                                                      | `object`                                                       | No                            | Module-wide sitemap delivery settings. Entirely sensitive.                                                             |
| `sitemaps.static`                                               | `Array<{ loc: string; … }>`                                    | No                            | Defaults to `[]`; each entry requires non-empty `loc` and may include other sitemap fields.                            |
| `sitemaps.apiEndpoint`                                          | absolute path string                                           | No                            | Defaults to `/api/_directus-sitemaps/urls`.                                                                            |
| `sitemaps.enablePrettyUrls`                                     | `boolean`                                                      | No                            | Defaults to `true`.                                                                                                    |
| `sitemaps.cache`                                                | `false \| { maxAge, staleMaxAge, swr }`                        | No                            | Defaults to `{ maxAge: 300, staleMaxAge: 0, swr: true }`; ages are non-negative integers in seconds.                   |
| `sitemaps.cache.maxAge`                                         | non-negative integer                                           | No                            | Fresh-cache duration in seconds; defaults to `300`.                                                                    |
| `sitemaps.cache.staleMaxAge`                                    | non-negative integer                                           | No                            | Stale-cache duration in seconds; defaults to `0`.                                                                      |
| `sitemaps.cache.swr`                                            | `boolean`                                                      | No                            | Enables stale-while-revalidate; defaults to `true`.                                                                    |
| `sitemaps.prerenderSitemaps`                                    | `boolean`                                                      | No                            | Defaults to `false`; emits sitemap routes as static output.                                                            |

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
default `directus.config.ts` is valid and resolves to empty shared configuration.

| Prop name                   | Data type                   | Required | Description                                                                                              |
| --------------------------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `directusConfig.enabled`    | `boolean`                   | No       | Defaults to `true`; enables discovery and virtual-module generation.                                     |
| `directusConfig.configFile` | non-empty `string \| false` | No       | Defaults to `directus.config.ts`; use a root-relative or absolute path, or `false` to disable discovery. |

## Public API and virtual aliases

`@onderwijsin/nuxt-directus-config/config` exports:

- `defineDirectusConfig(config)` — typed identity helper for a strict config source.
- `validateDirectusConfig(value)` — runtime validation returning `ResolvedDirectusConfig`.
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

Requires Nuxt 4 and Node.js 22 or newer.
