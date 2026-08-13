import { varlockVitePlugin } from "@varlock/vite-integration";
import { ENV } from "varlock/env";
import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  vite: {
    plugins: [varlockVitePlugin({ ssrInjectMode: "auto-load" })]
  },
  modules: ["@sentry/nuxt/module", "@onderwijsin/nuxt-sentry-config"],
  appConfig: { packageName },
  runtimeConfig: {
    app: { buildId: String(Date.now()) }
  },
  sentry: ENV.SENTRY_DSN
    ? {
        org: ENV.SENTRY_ORG,
        project: ENV.SENTRY_PROJECT,
        authToken: ENV.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          disable: !ENV.SENTRY_UPLOAD_SOURCE_MAPS
        }
      }
    : false,
  sentryConfig: {
    dsn: ENV.SENTRY_DSN,
    configFile: "sentry.config.ts"
  }
});
