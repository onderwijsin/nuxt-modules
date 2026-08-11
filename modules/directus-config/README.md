# @onderwijsin/nuxt-directus-config

Shared, executable Directus configuration for Nuxt. The module discovers a `directus.config.ts`
source file, validates it once during Nuxt setup, and makes the resolved configuration available to
related Directus modules.

It is optional: Directus modules remain configurable directly through `nuxt.config.ts`. When both
are used, a module's direct options take precedence over its shared configuration.

## Installation

```sh
pnpm add @onderwijsin/nuxt-directus-config
```

Register this module before the Directus modules that consume its configuration:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus"]
});
```

## Shared configuration

Create `directus.config.ts` at the application root:

```ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
    commands: ["readItem", "readItems"],
    preview: { enabled: true },
    auth: { enabled: true }
  }
});
```

### Instance

`instance.baseUrl` and `instance.staticToken` are optional, although the Directus modules don't
really work without `instance.baseUrl`. However, for compatibility with for example CI environments,
they can be omitted.

Both `instance.baseUrl` and `instance.staticToken` are marked sensitive and never appear in the
client application.

### Client

`client` contains settings for the Directus SDK client module. Its schema supplies defaults for the
proxy path, SDK commands, preview query keys, authentication cookie settings, and type generation.
Configure only the settings you need:

```ts
mport { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
    proxy: {
      path: "/_directus/proxy"
    },
    commands: ["readItem", "readItems"],
    preview: {
      enabled: true,
      versioning: true,
      queryKeys: {
        preview: "preview",
        token: "token",
        version: "version",
        id: "id"
      }
    },
    auth: {
      enabled: true,
      turnstile: {
        enabled: true
      },
      cookie: {
        name: "directus_session",
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 2_592_000,
        domain: "example.com"
      },
      refreshSafetyWindow: 30_000,
      passwordResetUrl: "https://app.example.com/reset-password"
    },
    typegen: {
      enabled: true,
      introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN,
      cache: {
        maxAge: 3_600_000
      },
      augmentations: {
        removeEnums: true,
        replaceAnyWithUnknown: true,
        replaceJsonWithJSON: true,
        applyTypeNameOverrides: true,
        makeNonNullableOptionalsRequired: true,
        mergeJsDocs: true
      },
      rules: {
        articles: {
          body: "RichText"
        }
      },
      transform: (source, context) => {
        console.log(`Generated ${context.collections.length} Directus collection types.`);
        return source;
      }
    }
  }
});
```

The supported SDK command names are exported as `supportedDirectusCommands` from
`@onderwijsin/nuxt-directus-config/schema`.

## Collection configuration

Collection configuration allows you to define which role individual Directus collections play during
setup and build. At provides configuration used by `nuxt-directus-sitemaps` and
`nuxt-directus-prerender`.

## Virtual modules and secrets

Two virtual modules expose separate trust boundaries:

- `#directus-config` is safe to import from app and client code. It contains only public proxy,
  preview, and authentication-enabled settings.
- `#directus-config-server` contains the complete resolved configuration. Import it only from Nitro
  server code:

  ```ts
  import directusConfig from "#directus-config-server";
  ```

It has no client runtime alias, so credentials cannot be bundled into the browser.

## Discovery options

By default the module looks for `<rootDir>/directus.config.ts`. Change or disable discovery in
`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  directusConfig: {
    configFile: "config/directus.ts"
  }
});
```

Use `configFile: false` to disable discovery. A missing default file is valid and resolves to an
empty shared configuration.

## Schema API

The `@onderwijsin/nuxt-directus-config/schema` subpath exports the source-of-truth Zod schemas and
their inferred input/output types. Use `DirectusConfig` for source input and
`ResolvedDirectusConfig` for validated configuration. Fields marked with `.sensitive()` are removed
automatically from the derived public schema.

## Compatibility

Requires Nuxt 4 and Node.js 22 or newer.
