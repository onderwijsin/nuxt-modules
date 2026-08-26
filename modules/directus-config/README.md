# @onderwijsin/nuxt-directus-config

Shared, executable Directus configuration for Nuxt. It discovers `directus.config.ts`, validates it
once during Nuxt setup, and makes the resolved settings available to related Directus modules.

The module is optional: each Directus module can still be configured in `nuxt.config.ts`. When both
are used, direct module options take precedence over shared configuration.

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus-config
```

Register it before modules that consume the configuration:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus-client"]
});
```

## Shared configuration

Create `directus.config.ts` in the application root:

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
    commands: ["readItem", "readItems"],
    auth: {
      enabled: true,
      sessionSecret: process.env.DIRECTUS_SESSION_SECRET
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
  },
  prerenderer: {
    includeStaticSitemapUrls: false,
    queryLimit: 100,
    failureMode: "best-effort"
  }
});
```

The source is executable TypeScript. Use it for server-only values and functions; Nuxt config is
serialised and is not suitable for those values.

For authentication, cookies, sealing, and secret rotation details, see the
[`@onderwijsin/nuxt-directus-client` Authentication documentation](../directus-client/README.md#authentication).
Generate a session secret with:

```sh
openssl rand -base64 32
```

### `instance`

| Option        | Required | Description                                                              |
| ------------- | -------- | ------------------------------------------------------------------------ |
| `baseUrl`     | No       | Directus instance URL. Consumers that make Directus requests require it. |
| `staticToken` | No       | Server-only static Directus credential.                                  |

Both fields are sensitive and never appear in the client-safe virtual configuration.

### `client`

`client` contains Directus client module settings. Its nested schemas provide defaults.

| Option                         | Default                             | Description                                                                                       |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `proxy.path`                   | `/_directus/proxy`                  | Local proxy route. It cannot be root, contain traversal segments, or overlap `/_directus/auth`.   |
| `commands`                     | `readItem`, `readItems`             | SDK commands that the Directus client module auto-imports.                                        |
| `preview.enabled`              | `true`                              | Enables preview query parsing.                                                                    |
| `preview.versioning`           | `true`                              | Enables Content Version preview lookup.                                                           |
| `preview.queryKeys`            | `preview`, `token`, `version`, `id` | Preview query parameter names.                                                                    |
| `auth.enabled`                 | `false`                             | Enables cookie-backed authentication.                                                             |
| `auth.turnstile.enabled`       | `false`                             | Enables Turnstile protection for authentication requests.                                         |
| `auth.magicLinks.enabled`      | `false`                             | Enables optional Directus magic-link authentication routes; requires `auth.enabled`.              |
| `auth.magicLinks.redirectUrl`  | —                                   | Absolute, server-only callback URL required when magic links are enabled.                         |
| `auth.cookie`                  | See below                           | Session-cookie settings: `name`, `secure`, `sameSite`, `path`, `maxAge`, and optional `domain`.   |
| `auth.refreshSafetyWindow`     | `30000`                             | Milliseconds before expiry when a session is refreshed.                                           |
| `auth.sessionSecret`           | —                                   | Server-only H3 sealing secret; required for enabled auth and must contain at least 32 characters. |
| `auth.previousSessionSecrets`  | `[]`                                | Server-only previous sealing secrets tried during staged key rotation.                            |
| `auth.maskSecretsInPlayground` | `true`                              | Masks access and refresh tokens in the local session inspection playground.                       |
| `auth.passwordResetUrl`        | —                                   | URL sent to Directus for password-reset requests.                                                 |
| `typegen.enabled`              | `true`                              | Enables generated `#directus` schema declarations.                                                |
| `typegen.introspectionToken`   | —                                   | Server-only schema-introspection token.                                                           |
| `typegen.cache.maxAge`         | `3600000`                           | Development type-generation cache lifetime in milliseconds.                                       |
| `typegen.augmentations`        | All `true`                          | Generated-source transforms.                                                                      |
| `typegen.rules`                | `{}`                                | Collection and field type-expression overrides.                                                   |
| `typegen.transform`            | —                                   | Final executable transform: `(source, context) => string`.                                        |

Magic links require the `directus-magic-links-bundle` extension in Directus. The configured callback
URL is server-only and is not included in the client-safe configuration.

The default cookie is
`{ name: "directus_session", secure: true, sameSite: "lax", path: "/", maxAge: 2592000 }`.
`commands`, authentication cookie settings, refresh timing, session sealing secrets, password-reset
URL, and type-generation settings are sensitive and excluded from the client-safe configuration.

The supported command names are exported as `supportedDirectusCommands` from
`@onderwijsin/nuxt-directus-config/schema`.

### `collections`

`collections` is a shared list of executable collection behaviour. It is intentionally portable: the
sitemap and prerender modules use their respective configuration blocks.

Each collection entry has these options:

| Option             | Description                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `collection`       | Required Directus collection name.                                                                            |
| `sitemap`          | `false` to exclude the collection, or sitemap configuration.                                                  |
| `sitemap._sitemap` | Optional named `@nuxtjs/sitemap` destination for this collection’s mapped URLs.                               |
| `sitemap.fields`   | Optional Directus fields to fetch.                                                                            |
| `sitemap.filter`   | Optional Directus filter.                                                                                     |
| `sitemap.fieldmap` | Optional declarative map from sitemap properties to Directus record properties; `loc` is required.            |
| `sitemap.fetcher`  | Optional async custom fetcher. It receives `{ collection, fields, filter }`; its result is mapped afterwards. |
| `sitemap.mapper`   | Optional executable mapper called for every fetched item. Return one sitemap entry, `null`, or `undefined`.   |
| `prerender`        | `false` or prerender configuration for `@onderwijsin/nuxt-directus-prerenderer`.                              |

Runtime mapping prefers a custom fetcher, then an executable mapper, then a fieldmap, and finally
the record itself. A sitemap mapper returns a sitemap entry with required `loc` and optional
`lastmod`, `changefreq`, `priority`, `images`, `videos`, `news`, `alternatives`, and sitemap
metadata fields. The entry may also include `noIndex: true` to omit it. `priority` is one of `0`,
`0.1`, …, `1`.

The complete sitemap-entry schema is maintained in
[`src/schema/sitemap-entry.ts`](src/schema/sitemap-entry.ts). Import its exports from
`@onderwijsin/nuxt-directus-config/schema` instead of recreating the shape.

Prerender configuration supports `fields`, `filter`, a `fieldmap` with required `route`, an
executable `mapper` returning one or more route paths, and an executable `fetcher`. Use the mapper
for composite routes such as `${item.parent.path}/${item.slug}`. The prerender module only adds
content routes; sitemap XML prerendering remains controlled by `sitemaps.prerenderSitemaps`.

Collection configuration, including mappers and fetchers, is sensitive and never sent to client
code.

### `sitemaps`

`sitemaps` contains module-wide sitemap delivery settings, independent of which collections are
selected:

| Option               | Default                                      | Description                                                                                 |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `static`             | `[]`                                         | Static sitemap entries. Each entry requires `loc`; additional sitemap fields are preserved. |
| `apiEndpoint`        | `/api/_directus-sitemaps/urls`               | Sitemap source endpoint.                                                                    |
| `sitemapsPathPrefix` | `/__sitemap__/`                              | Path prefix for named sitemap XML routes.                                                   |
| `enablePrettyUrls`   | `true`                                       | Enables pretty sitemap URL routes.                                                          |
| `cache`              | `{ maxAge: 300, staleMaxAge: 0, swr: true }` | Endpoint cache options in seconds, or `false` to disable caching.                           |
| `prerenderSitemaps`  | `false`                                      | Prerenders sitemap routes as static output.                                                 |
| `queryLimit`         | `100`                                        | Maximum number of records requested per built-in Directus page.                             |
| `failureMode`        | `"best-effort"`                              | `"best-effort"` omits a collection after a failed page; `"hard-failure"` aborts generation. |

Sitemap settings are sensitive because they may include static URLs and delivery policy; they are
available only to consuming server-side modules.

### `prerenderer`

`prerenderer` contains module-wide build-time route discovery settings. Direct options under
`directusPrerenderer` take precedence over these shared values.

| Option                     | Default         | Description                                               |
| -------------------------- | --------------- | --------------------------------------------------------- |
| `includeStaticSitemapUrls` | `false`         | Adds static sitemap URLs to the Nuxt prerender route set. |
| `queryLimit`               | `100`           | Maximum records requested per built-in Directus page.     |
| `failureMode`              | `"best-effort"` | Omits failed collections or aborts with `"hard-failure"`. |

## Virtual modules

The module exposes two aliases with different trust boundaries:

| Alias                     | Where it can be imported     | Default export                                                                                   |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `#directus-config`        | App, server, and client code | Sanitized public configuration: proxy, preview, and public authentication-enabled settings only. |
| `#directus-config-server` | Nitro server code only       | Full `ResolvedDirectusConfig`, including credentials and executable configuration.               |

```ts
// server/api/example.get.ts
import directusConfig from "#directus-config-server";
```

Never import `#directus-config-server` from client code. Nuxt also type-checks server routes in the
application context, so this alias is declared for both Nuxt and Nitro type contexts; see
[Nuxt’s documented limitation](https://nuxt.com/docs/4.x/guide/modules/recipes-advanced#type-checking-server-routes-in-app-context).

## Discovery and module options

The Nuxt module options are configured under `directusConfig`:

| Option       | Default              | Description                                                              |
| ------------ | -------------------- | ------------------------------------------------------------------------ |
| `enabled`    | `true`               | Enables source discovery and virtual-module generation.                  |
| `configFile` | `directus.config.ts` | Root-relative or absolute config path; set `false` to disable discovery. |

A missing default file is valid and resolves to an empty shared configuration.

## Public API

`@onderwijsin/nuxt-directus-config/config` exports:

- `defineDirectusConfig(config)` — strict, typed configuration helper.
- `validateDirectusConfig(config)` — validates unknown input and returns `ResolvedDirectusConfig`.
- `getResolvedDirectusConfigFromSource(rootDir, configFile)` — loads and validates a consumer source
  during Nuxt module dependency discovery.
- `applyOverridesToCollectionConfig(collections, overrides, property)` — merges module-specific
  collection overrides while preserving unrelated collection behavior.
- `DirectusConfig` and `ResolvedDirectusConfig` types.

`@onderwijsin/nuxt-directus-config/schema` exports the source-of-truth Zod schemas, their inferred
option types, `supportedDirectusCommands`, `getPublicSchema`, and the resolved-config helpers used
by related modules. Fields marked `.sensitive()` are automatically removed by `getPublicSchema()`;
do not maintain a separate client-side sanitizer.

## Compatibility

Requires Nuxt 4 and Node.js 24 or newer. Node.js 22 may work but is untested and unsupported.
