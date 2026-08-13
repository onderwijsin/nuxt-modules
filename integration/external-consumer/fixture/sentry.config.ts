import { defineSentryServerConfig } from "@onderwijsin/nuxt-sentry-config/runtime";

export default defineSentryServerConfig(({ runtime, runtimeConfig }) => ({
  dsn: runtimeConfig.public.sentry.dsn,
  enabled: false,
  environment: runtime
}));
