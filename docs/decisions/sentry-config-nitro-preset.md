# Decision: Read `NITRO_PRESET` during Sentry module setup

- **Status:** Accepted
- **Date:** 2026-08-11
- **Scope:** Sentry module setup and Nitro runtime selection

## Context

`@onderwijsin/nuxt-sentry-config` selects Node or Cloudflare startup during Nuxt module setup. For
bundled SDK 11 startup, it also selects the runtime when declaring module dependencies because
Sentry discovers its server config during its own setup. During `nuxt dev`, Nitro's selection may
exist in `process.env.NITRO_PRESET` before Nuxt materializes it in `nuxt.options.nitro.preset`.

## Decision

The module selects the preset from `nuxt.options.nitro.preset`, then intentionally reads
`process.env.NITRO_PRESET`, and finally defaults to `node-server`. It registers the appropriate
integration at setup time. Consumers can explicitly override detection with `sentryConfig.runtime`.

This is a narrow exception to the repository preference for Nuxt configuration reads. The
environment variable is Nitro's documented build input, not an application secret or arbitrary
consumer setting.

## Alternatives considered

- Reading only resolved Nuxt Nitro options: rejected because the value may not be materialized at
  the required lifecycle stage.
- Reading arbitrary environment configuration: rejected because this exception is limited to Nitro's
  own build-selection input.
- Deferring registration until build output exists: rejected because the wrong integration would be
  registered during development.

## Consequences

Cloudflare development sessions select the correct integration early, while the module retains a
small direct environment dependency. The fallback preserves the Node server default and explicit
consumer configuration remains authoritative.

## Reconsideration criteria

Revisit this decision if Nuxt reliably exposes the preset before module setup or provides another
stable lifecycle API for selecting the Nitro integration.

## Cleanup when SDK 10 support ends

### Remove the SDK 10 branches

- Drop `^10.69.0` from `modules/sentry-config/package.json`. Pin a supported SDK 11 version in
  `pnpm-workspace.yaml` for the module and playground, then refresh the lockfile.
- In `src/config/runtime.ts`, delete `isSentryV11` and the `@sentry/nuxt/package.json` import. Make
  `generateSentryConfigSource` import `defaultSentryConfigV11` directly for Node and Cloudflare. In
  `playground/sentry.client.config.ts`, remove the same version lookup and spread that default
  directly.
- In `src/runtime/index.ts`, remove `legacyDefaults`, `defaultSentryServerConfig`, and
  `defaultSentryClientConfig`. Fold `commonDefaults` into `defaultSentryConfigV11` and simplify the
  `restrictiveDataCollection` type check once the installed SDK owns the `queues` type. Keep the SDK
  11 default's public name and collection settings.

### Simplify Node startup in `modules/sentry-config`

- In `src/module.ts`, remove the major-version check from `usesBundledNodeConfig` and the
  `isSentryV11` gate on the `moduleDependencies` tuple-option lookup. The rest of the helper selects
  between bundled startup, `autoInjectServerConfig: false`, and the standalone fallback for
  `sentry: false` or `sentry.enabled: false`. If both standalone modes are retired, remove
  `usesBundledNodeConfig` and simplify the two call sites in `moduleDependencies` and `setup`. Drop
  the `Nuxt` type and `hasKey` import if they become unused.
- If explicit `--import` is the only standalone mode kept, remove the Rollup `banner` hook from
  `createSentryPreloadPlugin`. If both modes are retired, remove the standalone `nitro:init` branch,
  `createSentryPreloadPlugin`, its `VIRTUAL_SENTRY_CONFIG_ID` and `SENTRY_PRELOAD_FILENAME`, and
  `generateNodeSentryConfigSource`. Remove `autoInjectServerConfig` from
  `src/config/options.schema.ts` and the module defaults. Migrate those deployments to
  `node .output/server/index.mjs`.
- Treat `src/runtime/server/node/sentry.server.config.mjs`, the `@sentry/nuxt/module` dependency's
  `configDir` default, and the `#sentry-config/node-config.mjs` template as one integration. Sentry
  discovers that file during setup, which enables automatic Nitro error capture. Delete the bridge
  only when another supported path supplies the shared config before Sentry's setup. Keep the early
  tuple lookup while dependency registration depends on inline options such as `runtime`. If that
  lookup goes away, replace the `sentryConfigModule` declaration with a direct default export and
  remove `isArray` and `isRecord` from the module wherever they become unused.
- Keep both `cloudflare_module` and `cloudflare-module` detection in `resolveSentryRuntime` and keep
  the existing Cloudflare plugin. Keep both entries in `SENTRY_NITRO_UPLOAD_PLUGINS`.
  `stripSentryNitroRollupPlugin` removes `sentry-rollup-plugin` and `sentry-rollup-upload-staging`
  while preserving instrumentation.

### Update verification and migration docs

- In `startup.e2e.test.ts` and `artifacts.e2e.test.ts`, remove the SDK version imports and SDK 10
  preload and settings assertions. Remove `sendDefaultPii` and `enableLogs` from `readyz.get.ts` and
  require `dataCollection` in the startup schema. Keep bundled startup and single-capture checks.
  Update `runtime.test.ts` preload cases to match the modes the module still supports.
- In `integration/external-consumer/run.mjs`, remove `sentryV11`, the SDK 10 typecheck variant, and
  the legacy defaults assertions. Keep the thrown-route check for the Sentry layer and keep the
  `inspect` path in its `sentry-config.get.ts` fixture so the check can observe the captured event.
  Remove the legacy fields from that fixture. The `--sentry-sdk-version` option can still test SDK
  11 patches.
- Update the package README, installable consumer skill, and packed-consumer README. Add a
  retirement Changeset covering removed exports and any startup migration. Verify that packed Node
  and Cloudflare builds each capture one thrown route error through a local transport.
