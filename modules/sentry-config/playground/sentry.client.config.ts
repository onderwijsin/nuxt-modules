import * as Sentry from "@sentry/nuxt";
import { useRuntimeConfig } from "#app";
import { defaultSentryClientConfig } from "@onderwijsin/nuxt-sentry-config/runtime";

Sentry.init({
  ...defaultSentryClientConfig,
  environment: useRuntimeConfig().public.sentry.runtime,
  dsn: useRuntimeConfig().public.sentry.dsn
});
