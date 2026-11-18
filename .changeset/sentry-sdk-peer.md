---
"@onderwijsin/nuxt-sentry-config": patch
---

Use the application's Sentry SDK through a required `@sentry/nuxt` peer (`^10.69.0`), replacing the
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
  sentry: { autoInjectServerSentry: false }
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
