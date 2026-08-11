import { defineSentryServerConfig } from "@onderwijsin/nuxt-sentry-config/runtime";

export default defineSentryServerConfig(({ runtime, runtimeConfig }) => ({
  dsn: runtimeConfig.public.sentry.dsn,
  enabled: Boolean(runtimeConfig.public.sentry.dsn),
  environment: runtime,
  release: runtimeConfig.app.buildId
}));
