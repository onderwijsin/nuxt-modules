import * as Sentry from "@sentry/nuxt";
import sentryPackage from "@sentry/nuxt/package.json" with { type: "json" };
import { useRuntimeConfig } from "#app";
import {
  defaultSentryClientConfig,
  defaultSentryConfigV11
} from "@onderwijsin/nuxt-sentry-config/runtime";

const defaults = sentryPackage.version.startsWith("11.")
  ? defaultSentryConfigV11
  : defaultSentryClientConfig;

Sentry.init({
  ...defaults,
  environment: useRuntimeConfig().public.sentry.runtime,
  dsn: useRuntimeConfig().public.sentry.dsn
});
