---
"@onderwijsin/nuxt-sentry-config": patch
---

Fix Node Sentry startup by emitting the preload import during Rollup output, before Nitro starts a
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
  sentryConfig: { autoInjectServerConfig: false }
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
