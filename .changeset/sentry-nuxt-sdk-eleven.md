---
"@onderwijsin/nuxt-sentry-config": minor
---

Support the application-owned `@sentry/nuxt` peer on `^10.69.0 || ^11.14.0`. SDK 10 applications
can keep their SDK, configuration, and startup commands.

To adopt SDK 11, run `pnpm add '@sentry/nuxt@^11.14.0'` in the application. Keep server initialization
options in `sentry.config.ts`, switch any `sendDefaultPii` overrides to `dataCollection`, and remove
`enableLogs`. In `sentry.client.config.ts`, spread `defaultSentryConfigV11` from
`@onderwijsin/nuxt-sentry-config/runtime` for restrictive data-collection defaults. Spread its
`dataCollection` object before overriding individual categories.

Automatic Node startup on SDK 11 uses Sentry's bundled Nitro integration. Leave `sentry.configDir`
and `sentry.autoInjectServerSentry` unset and start with `node .output/server/index.mjs`. Explicit
preloading remains available with `sentryConfig.autoInjectServerConfig: false` and
`node --import ./.output/server/sentry.server.config.mjs .output/server/index.mjs`. Cloudflare uses
the shared configuration through the Worker plugin.

Run `pnpm exec nuxt prepare`, `pnpm exec nuxt typecheck`, and `pnpm exec nuxt build` in the application.
Check the configured diagnostic route and verify that the expected error arrives in Sentry.
