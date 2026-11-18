import { init } from "@sentry/nuxt";
import { resolveSentryConfig } from "#sentry-config/node-config.mjs";

init(resolveSentryConfig());
