import directusModule from "../../../src/module";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  alias: {
    "@nuxtjs/turnstile/runtime/server/utils/verify.js": fileURLToPath(
      new URL("./server/fixture-verify.ts", import.meta.url)
    )
  },
  modules: [directusModule],
  turnstile: { siteKey: "fixture-site-key", secretKey: "fixture-secret-key" },
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
