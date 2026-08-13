export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-sentry-config"],
  sentryConfig: { dsn: "https://public@example.ingest.sentry.io/1", configFile: "sentry.config.ts" }
});
