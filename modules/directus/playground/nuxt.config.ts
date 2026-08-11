import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-directus"],
  appConfig: { packageName },
  runtimeConfig: {
    public: { playgroundPreviewToken: process.env.DIRECTUS_PREVIEW_TOKEN ?? "" }
  },
  turnstile: {
    siteKey: "1x00000000000000000000AA",
    secretKey: "1x0000000000000000000000000000000AA"
  },
  directus: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN,
    auth: {
      enabled: true,
      turnstile: { enabled: true },
      cookie: {
        secure: process.env.DIRECTUS_AUTH_COOKIE_SECURE === "true"
      },
      ...(process.env.DIRECTUS_PASSWORD_RESET_URL
        ? { passwordResetUrl: process.env.DIRECTUS_PASSWORD_RESET_URL }
        : {})
    },
    typegen: { introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN }
  }
});
