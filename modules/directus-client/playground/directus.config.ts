import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";
import { ENV } from "varlock/env";

export default defineDirectusConfig({
  instance: {
    baseUrl: ENV.DIRECTUS_URL,
    proxyToken: ENV.DIRECTUS_PROXY_TOKEN
  },
  client: {
    auth: {
      enabled: true,
      sessionSecret:
        ENV.DIRECTUS_SESSION_SECRET || "nuxt-directus-development-session-secret-32-chars",
      turnstile: { enabled: true },
      cookie: {
        secure: ENV.DIRECTUS_AUTH_COOKIE_SECURE
      },
      ...(ENV.DIRECTUS_PASSWORD_RESET_URL
        ? { passwordResetUrl: ENV.DIRECTUS_PASSWORD_RESET_URL }
        : {})
    },
    typegen: { introspectionToken: ENV.DIRECTUS_INTROSPECTION_TOKEN }
  }
});
