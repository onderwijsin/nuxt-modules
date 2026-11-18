# Changelog

## 0.2.4

### Patch Changes

- e708b2d: Fix Node Sentry startup by emitting the preload import during Rollup output, before Nitro starts a
  development worker. This removes the post-write race that could make workers exit with code 0 and
  keeps source maps aligned with the emitted entry. Existing Sentry initialization options remain
  compatible.

  **Upgrade and peer dependencies**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the module and explicitly retain its required
  application-owned v10 SDK peer; this release also moves SDK ownership out of the module:

  ```sh
  pnpm add @onderwijsin/nuxt-sentry-config@0.2.4 '@sentry/nuxt@^10.69.0'
  ```

  Keep application Vue `^3.5.0` and, when the diagnostics page is enabled, Nuxt UI `^4.0.0`. Keep any
  other directly installed Sentry SDK packages on the same SDK version. SDK 11 is unsupported; do not
  use overrides to bypass the v10 peer contract.

  If Vue is not already a direct compatible application dependency, add it with
  `pnpm add 'vue@^3.5.0'`. For an enabled diagnostics page with no compatible Nuxt UI installation,
  use `pnpm add '@nuxt/ui@^4.0.0'`. Resolve outstanding peer warnings before deploying; these commands
  are not a reason to replace versions that already satisfy the ranges.

  **Choose one Node startup path**

  For the default `sentryConfig.autoInjectServerConfig: true`, no config migration is needed. Rebuild
  and use the ordinary Nitro startup command:

  ```sh
  pnpm exec nuxt build
  node .output/server/index.mjs
  ```

  Remove an extra Node `--import` argument or `NODE_OPTIONS` preload only if you added it as a
  workaround while leaving automatic injection enabled. Do not combine the two startup strategies. Set
  the upstream `sentry.autoInjectServerSentry` option to `false` if previously enabled, and remove any
  additional server initialization call added alongside this module.

  If you intentionally own the preload command, keep automatic injection disabled:

  ```ts
  export default defineNuxtConfig({
    sentryConfig: { autoInjectServerConfig: false },
  });
  ```

  Then start the built server from the application root:

  ```sh
  node --import ./.output/server/sentry.server.config.mjs .output/server/index.mjs
  ```

  The preload file is still emitted when automatic injection is disabled. Preserve existing
  `configFile`, DSN, transport, and redaction settings. Keep `@sentry/nuxt/module` and
  `@onderwijsin/nuxt-sentry-config` registered once each. Cloudflare deployments keep their generated
  Nitro plugin and normal Worker deployment; do not add Node preload flags there.

  **Verify the upgrade**

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.
  Run `pnpm exec nuxt prepare` and your application's typecheck. Restart development, check both the
  first start and a cached restart, and request a server-rendered route to confirm the worker stays
  running. Rebuild production, start it using the selected command above, and trigger one controlled
  server error to confirm a single Sentry event. No manual edits to generated Nitro output are needed.

- e708b2d: Use the application's Sentry SDK through a required `@sentry/nuxt` peer (`^10.69.0`), replacing the
  module's private SDK dependency. Applications upgrading from module version 0.2.3 must explicitly
  manage that SDK dependency, including when diagnostic tools are disabled.

  **Upgrade and resolve peers**

  Use Node.js 24 or newer and Nuxt 4. In the application package that registers the module:

  ```sh
  pnpm add @onderwijsin/nuxt-sentry-config@0.2.4 '@sentry/nuxt@^10.69.0'
  pnpm why @sentry/nuxt
  ```

  Keep Vue `^3.5.0` supplied by the application; if missing or incompatible, add it with
  `pnpm add 'vue@^3.5.0'`. The default diagnostics page additionally requires Nuxt UI `^4.0.0`; if it
  is missing, install it with `pnpm add '@nuxt/ui@^4.0.0'`. If you do not use the page, set
  `sentryConfig.testTools.page` to `false` (or `testTools: false` for both tools) instead of adding
  Nuxt UI solely for diagnostics. The SDK peer remains required in either case.

  Keep other directly installed Sentry SDK packages on the same exact SDK version as `@sentry/nuxt`.
  Resolve conflicting package ranges and lockfile entries rather than forcing an incompatible SDK
  through an override. Version 11 is unsupported: do not install `@sentry/nuxt@latest` without the v10
  range or widen the peer range locally. This release retains v10 `sendDefaultPii` and `enableLogs`
  options and its existing initialization model. Packed consumers were checked with SDK 10.69.0 and
  10.78.0; a separate compatible module release is required for SDK 11.

  **Keep one server initialization owner**

  Keep the upstream Sentry module and this module registered once each:

  ```ts
  export default defineNuxtConfig({
    modules: ["@sentry/nuxt/module", "@onderwijsin/nuxt-sentry-config"],
    sentry: { autoInjectServerSentry: false },
    // Merge this flag into existing sentry options; preserve sentryConfig.
  });
  ```

  Keep build-time SDK options (`org`, `project`, authentication and sourcemaps) under `sentry`, and
  this module's server initialization options under `sentryConfig` / its `configFile`. Set
  `sentry.autoInjectServerSentry` to `false` if previously enabled, and remove any second server
  `Sentry.init()` added alongside this module. Existing consumer-owned client configuration remains in
  place.

  For Node's default `autoInjectServerConfig: true`, use `node .output/server/index.mjs` without an
  additional `--import` or `NODE_OPTIONS` preload. If deliberately using a manual preload, keep
  `autoInjectServerConfig: false` and your explicit preload command. Cloudflare continues to use the
  generated Nitro plugin, with no Node preload flag.

  **Verify the upgrade**

  Commit the updated application manifest and lockfile, run `pnpm exec nuxt prepare`, your
  application's typecheck, and `pnpm exec nuxt build`, then start the deployed runtime. In a
  controlled environment, trigger one client and one server error and confirm one event per capture.
  The default `/_sentry` diagnostic page and `/api/_sentry/trigger-error` endpoint can be used when
  enabled.

  Existing `beforeSend` hooks and scrubbing remain necessary for application-attached sensitive data;
  `sendDefaultPii: false` does not redact everything supplied by application code or integrations.

- Updated dependencies [e708b2d]
  - @onderwijsin/nuxt-module-utils@0.5.2

## 0.2.3

### Patch Changes

- 0381721: Use application-owned @nuxt/ui, vue peer dependencies to preserve shared runtime identity. Keep exact catalog-pinned development installations and automatic Nuxt module registration.

## 0.2.2

### Patch Changes

- 451c582: Raise the supported and validated Node.js baseline to Node.js 24.
- Updated dependencies [1e30fbb]
- Updated dependencies [451c582]
  - @onderwijsin/nuxt-module-utils@0.5.1
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.4

## 0.2.1

### Patch Changes

- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
- Updated dependencies [979e8f3]
  - @onderwijsin/nuxt-module-utils@0.5.0
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.3

## 0.2.0

### Minor Changes

- 8585ca5: Add runtime-portable Sentry server initialization for Node and Cloudflare Nitro deployments.

### Patch Changes

- f78b723: Co-locate public module option types with their Zod schemas and preserve runtime domain types in published runtime-owned locations.
- Updated dependencies [f78b723]
- Updated dependencies [91ebdd2]
  - @onderwijsin/nuxt-simple-rate-limiter@0.4.2
  - @onderwijsin/nuxt-module-utils@0.4.0

## 0.1.0

- Initial runtime-portable Sentry server configuration module.
