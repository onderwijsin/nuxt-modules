import { name as packageName } from "../package.json";

const sentryEnabled = Boolean(process.env.SENTRY_DSN);

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@sentry/nuxt/module", "@onderwijsin/nuxt-sentry-config"],
  appConfig: { packageName },
  runtimeConfig: {
    app: { buildId: String(Date.now()) }
  },
  sentry: sentryEnabled
    ? {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          disable: process.env.SENTRY_UPLOAD_SOURCE_MAPS !== "true"
        }
      }
    : false,
  sentryConfig: {
    dsn: process.env.SENTRY_DSN,
    configFile: "sentry.config.ts"
  }
});
