export default defineNuxtConfig({
  modules: ["@sentry/nuxt/module", "@onderwijsin/nuxt-sentry-config"],
  sentry: { sourcemaps: { disable: true }, telemetry: false },
  sentryConfig: { dsn: "https://public@example.ingest.sentry.io/1", configFile: "sentry.config.ts" }
});
