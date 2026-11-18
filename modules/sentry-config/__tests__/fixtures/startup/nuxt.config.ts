import sentryConfig from "../../../src/module";
import type { ModuleOptions } from "@sentry/nuxt/module";

export default defineNuxtConfig({
  buildDir: process.env.NUXT_BUILD_DIR,
  modules: [
    [
      "@sentry/nuxt/module",
      {
        sourcemaps: { disable: true },
        telemetry: false
      } satisfies ModuleOptions
    ],
    sentryConfig
  ],
  devtools: { enabled: false },
  ssr: false,
  sentryConfig: { configFile: "sentry.config.ts", testTools: false }
});
