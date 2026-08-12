# Shared Directus configuration

Read this decision before changing `@onderwijsin/nuxt-directus-config`, the `directus.config.ts`
source format, shared Directus schemas, `_directus`, `#directus-config`, `#directus-config-server`,
or how a Directus-related module receives configuration.

`@onderwijsin/nuxt-directus-config` is the domain owner for configuration shared by the Directus
client, sitemap, and future Directus modules. Its side-effect-free
`@onderwijsin/nuxt-directus-config/schema` export is the single source of truth for detailed
configuration types and the `directusInstanceSchema` and `directusClientSchema` validation schemas.
`@onderwijsin/nuxt-module-utils` remains generic module infrastructure and must not own
Directus-domain contracts.

The config module is optional. Each Directus module must continue to support direct Nuxt module
configuration without it. When installed, it discovers `directus.config.ts` in the Nuxt root by
default; `directusConfig.configFile` may select an absolute or root-relative alternative, and
`false` disables discovery. The file is executable TypeScript configuration, loaded during module
setup through Jiti. Jiti is required because native Node imports cannot reliably load a consumer's
TypeScript configuration source before Nuxt builds it.

The source has this high-level shape:

```ts
export default defineDirectusConfig({
  instance: {
    baseUrl: "https://cms.example.com",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {/* Directus client options */}
});
```

`instance.baseUrl` is optional. Modules which need an instance validate that requirement when they
compose their own direct and shared options. Collection configuration is part of the shared config
and is consumed by the sitemap and prerender modules. Collection mappers and fetchers are executable
and therefore remain server-only.

During its setup, the config module validates the complete source and stores it in the internal,
non-enumerable `nuxt.options._directus` slot. `_directus` is intentionally the shared namespace: the
existing `directus` module will later be renamed to `directus-client`, leaving `directus` available
for this domain-level state. Access is routed through the config package's resolved-config helpers
so consumers do not duplicate unsafe property access or validation.

Consumers merge their direct Nuxt module options over the relevant shared section with `defu`, then
validate the final result with their own composed module schema. Direct configuration therefore
always wins, including nested fields. The Directus client merges direct options over
`_directus.instance` and `_directus.client`. Arrays are intentionally replaced rather than combined,
so an application can fully override configured command lists.

For the shared config to be available during consumer setup, the config module must precede Directus
consumers in the Nuxt `modules` array:

```ts
modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus"];
```

The runtime aliases expose separate trust boundaries. `#directus-config` is a sanitized,
client-importable projection and may contain only proxy, preview, and public authentication-enabled
flags. Sensitivity is declared on the owning Zod fields with `.sensitive()` and the public
projection is derived by `getPublicSchema()`, rather than maintained as a separate allowlist. It
must never include the Directus base URL, static token, type-generation credentials, or auth cookie
details. `#directus-config-server` contains the complete validated configuration and is registered
as a Nitro server virtual module; client/Vite builds must not resolve it. The raw server virtual
module is for Nitro runtime code, whereas `_directus` is for Nuxt module setup. Nuxt also checks
server route files in the app TypeScript context, so the declaration is registered in both the Nuxt
and Nitro type contexts; see
[Nuxt's documented limitation](https://nuxt.com/docs/4.x/guide/modules/recipes-advanced#type-checking-server-routes-in-app-context).

Installing the `@onderwijsin/nuxt-directus-config` package as a dependency of another Directus
module does not register its Nuxt module automatically. Registration remains opt-in, preserving
direct-only configuration and avoiding a hidden module-order contract. Future Directus modules may
consume the schema package without requiring config-source discovery.
