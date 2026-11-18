---
"@onderwijsin/nuxt-sentry-config": patch
---

Use the application's Sentry SDK through a required `@sentry/nuxt@^10.69.0` peer instead of installing a separate SDK copy. Applications upgrading from 0.2.3 must explicitly install the v10 SDK. SDK 11 remains unsupported because its privacy options and server initialization require a separate compatible release.
