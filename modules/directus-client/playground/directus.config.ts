import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

console.log({
  baseUrl: process.env.DIRECTUS_URL,
  staticToken: process.env.DIRECTUS_STATIC_TOKEN,
  introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN
});

export default defineDirectusConfig({
  instance: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
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
