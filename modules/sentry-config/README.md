# @onderwijsin/nuxt-sentry-config

Configure Sentry server monitoring once and switch between Node and Cloudflare Nitro runtimes
without rewriting the initialization options.

## Installation

```sh
pnpm add @onderwijsin/nuxt-sentry-config
```

```ts
export default defineNuxtConfig({
  modules: ["@sentry/nuxt/module", "@onderwijsin/nuxt-sentry-config"],
  // Sentry's build-time module configuration remains separate from server initialization.
  sentry: {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
      disable: process.env.SENTRY_UPLOAD_SOURCE_MAPS !== "true"
    }
  },
  sentryConfig: {
    dsn: process.env.SENTRY_DSN,
    configFile: "sentry.config.ts"
  }
});
```

The module defaults to `node-server`. When `nitro.preset` or `NITRO_PRESET` is `cloudflare_module`,
it automatically uses Sentry's Cloudflare Nitro plugin instead. You can explicitly set
`sentryConfig.runtime` when runtime selection is managed outside those values.

`sentryConfig` does not replace the `sentry` option from `@sentry/nuxt/module`. Configure that
option separately for build-time concerns such as organisation, project, authentication, and
source-map uploads. The `sentryConfig` option only controls this module's runtime-portable server
initialization.

## One server config

The optional config file default-exports either the actual Sentry initialization object or a
resolver function:

```ts
// sentry.config.ts
import {
  defineSentryServerConfig,
  isCloudflare,
  isNode
} from "@onderwijsin/nuxt-sentry-config/runtime";

export default defineSentryServerConfig(({ runtime, runtimeConfig }) => ({
  dsn: runtimeConfig.public.sentry.dsn,
  environment: isCloudflare(runtime) ? "production-edge" : "production-server",
  sendDefaultPii: isNode(runtime),
  tracesSampleRate: isCloudflare(runtime) ? 0.05 : 0.1
}));
```

Use `isNode(runtime)` and `isCloudflare(runtime)` from the runtime export when a resolver needs a
readable runtime guard:

```ts
import {
  defineSentryServerConfig,
  isCloudflare,
  isNode
} from "@onderwijsin/nuxt-sentry-config/runtime";

export default defineSentryServerConfig(({ runtime }) => ({
  sendDefaultPii: isNode(runtime),
  tracesSampleRate: isCloudflare(runtime) ? 0.05 : 0.1
}));
```

The file is imported into the server build instead of serialized through Nuxt runtime config. This
preserves the complete Sentry option surface, including functions, integrations, transports, and
event hooks. Keep the object to options supported by both runtimes when the deployment should be
interchangeable; runtime-specific Sentry options remain available when needed.

Resolver functions receive `{ runtime, runtimeConfig }` when Sentry starts. `runtime` is either
`"node-server"` or `"cloudflare_module"`; `runtimeConfig` is Nitro's resolved runtime config with
matching `NUXT_*` environment variables applied at startup. For example,
`NUXT_PUBLIC_SENTRY_DSN=https://…` overrides `runtimeConfig.public.sentry.dsn` without rebuilding
the application. This lets one build and config file select guarded, runtime-specific options while
still accepting deployment-specific values.

The module writes `runtimeConfig.public.sentry.dsn` and `runtimeConfig.public.sentry.runtime` for
consumer-owned client and server config files. The DSN is public by design; never put the Sentry
auth token in runtime config.

When `configFile` is omitted, the module uses these defaults:

```ts
{
  enableLogs: true,
  enabled: true,
  sampleRate: 1,
  sendDefaultPii: false,
  tracesSampleRate: 0.1
}
```

The consumer config is shallow-merged over the defaults, so every field can be replaced. Set
`enabled: false` to keep the generated wiring inert in a particular deployment.

## Node runtime

For Node, the module emits `.output/server/sentry.server.config.mjs`. It initializes Sentry before
the Nitro server begins handling requests. Choose exactly one startup strategy; using two
initializes Sentry twice and can produce duplicate instrumentation and difficult-to-diagnose errors.

### Plug-and-play startup (default)

`autoInjectServerConfig` defaults to `true`. At build time the module places an import of the
emitted preload at the top of `.output/server/index.mjs`, so the ordinary Nitro command is
sufficient:

```sh
node .output/server/index.mjs
```

Use this option when the deployment platform controls the Node command or when the simplest
deployment path is preferred. Do not additionally pass Node's `--import` flag.

### Explicit Node preload

Set `autoInjectServerConfig: false` when you own the production command and deliberately preload
Sentry yourself:

```ts
export default defineNuxtConfig({
  sentryConfig: { autoInjectServerConfig: false }
});
```

Start the built server from the Nuxt project root:

```sh
node --import ./.output/server/sentry.server.config.mjs .output/server/index.mjs
```

For process managers that only expose environment-variable configuration, the equivalent is:

```sh
NODE_OPTIONS="--import ./.output/server/sentry.server.config.mjs" node .output/server/index.mjs
```

The preload file is emitted in both modes; the option only decides whether the module injects it
into Nitro's entrypoint. Do not also enable `@sentry/nuxt`'s `sentry.autoInjectServerSentry`,
because this module is already responsible for server initialization.

## Cloudflare runtime

Set Nitro's Cloudflare module preset and runtime selection happens automatically:

```ts
export default defineNuxtConfig({
  nitro: { preset: "cloudflare_module" }
});
```

Alternatively, set `sentryConfig.runtime: "cloudflare_module"` when the preset is supplied outside
the Nuxt config. The module generates a Nitro server plugin that calls `sentryCloudflareNitroPlugin`
with the same resolved server options used by Node. It also enables Nitro's Cloudflare Node
compatibility setting, which Sentry needs for request isolation.

There is no Node process or `--import` flag on Cloudflare. Deploy the regular Cloudflare Nitro
output; the generated Nitro plugin initializes Sentry in the Worker. Resolver functions still
receive `runtime: "cloudflare_module"`, so one config file can guard options that only work in Node:

```ts
import { defineSentryServerConfig, isNode } from "@onderwijsin/nuxt-sentry-config/runtime";

export default defineSentryServerConfig(({ runtime }) => ({
  integrations: isNode(runtime) ? [nodeOnlyIntegration()] : []
}));
```

Keep shared options portable, and use these guards for runtime-specific integrations, transports, or
SDK settings. `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are build-time source-map
upload credentials, not Worker runtime configuration. For a deployment-specific public DSN, use
Nuxt's `NUXT_PUBLIC_SENTRY_DSN` runtime-config override rather than exposing an auth token.

## Client defaults

Client config generation is intentionally outside this module. A reusable default object is exported
for a consumer-owned `sentry.client.config.ts`:

```ts
import * as Sentry from "@sentry/nuxt";
import { defaultSentryClientConfig } from "@onderwijsin/nuxt-sentry-config/runtime";

Sentry.init({
  ...defaultSentryClientConfig,
  dsn: "https://public-key@example.ingest.sentry.io/project-id"
});
```

## Source-map upload guard

`@sentry/nuxt` can register Sentry upload plugins for both Vite and the final Nitro Rollup build.
The extra Nitro pass can duplicate artifact work and significantly increase build memory, so this
module removes the `sentry-rollup-plugin` pass by default. Set `disableNitroSourceMapUpload: false`
to retain the upstream Nitro upload plugin.

## Options

| Option                        | Default  | Purpose                                                         |
| ----------------------------- | -------- | --------------------------------------------------------------- |
| `enabled`                     | `true`   | Enables all module wiring.                                      |
| `dsn`                         | omitted  | Public Sentry DSN exposed as `runtimeConfig.public.sentry.dsn`. |
| `runtime`                     | inferred | Overrides `node-server` or `cloudflare_module` detection.       |
| `configFile`                  | omitted  | Consumer config file, resolved from the Nuxt root.              |
| `autoInjectServerConfig`      | `true`   | Adds the generated Node preload to Nitro's entry.               |
| `disableNitroSourceMapUpload` | `true`   | Removes the duplicate Nitro Sentry upload pass.                 |

## Compatibility

Developed and tested against Nuxt 4.5.x, Nitro 2.13.x, and Sentry 10.69.x. The package requires
Node.js 22 or newer for builds and Node deployments.
