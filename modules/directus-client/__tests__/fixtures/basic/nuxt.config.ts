import directusModule from "../../../src/module";
import directusConfigModule from "@onderwijsin/nuxt-directus-config";

const refreshRedisUrl = process.env.DIRECTUS_E2E_REDIS_URL;

export default defineNuxtConfig({
  modules: [directusConfigModule, directusModule],
  turnstile: { siteKey: "fixture-site-key", secretKey: "fixture-secret-key" },
  nitro: {
    storage: {
      "directus-auth-refresh": {
        driver: refreshRedisUrl ? "redis" : "memory",
        ...(refreshRedisUrl
          ? {
              url: refreshRedisUrl,
              base: process.env.DIRECTUS_E2E_REDIS_BASE ?? "directus-e2e"
            }
          : {})
      }
    }
  },
  directusClient: {
    instance: {
      baseUrl: process.env.DIRECTUS_E2E_URL ?? "https://sandbox.directus.com"
    },
    client: {
      commands: ["readItems"],
      auth: {
        enabled: true,
        sessionSecret: "fixture-directus-session-secret-32-chars",
        turnstile: { enabled: true },
        magicLinks: {
          enabled: true,
          redirectUrl: "https://app.example.test/auth/magic-link"
        },
        cookie: { secure: false },
        passwordResetUrl: "https://app.example.test/reset-password"
      },
      typegen: { enabled: false }
    }
  }
});
