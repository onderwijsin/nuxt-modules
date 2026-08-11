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
  directus: {
    baseUrl: process.env.DIRECTUS_E2E_URL ?? "https://sandbox.directus.com",
    commands: ["readItems"],
    auth: {
      enabled: true,
      turnstile: { enabled: true },
      cookie: { secure: false },
      passwordResetUrl: "https://app.example.test/reset-password"
    },
    typegen: { enabled: false }
  }
});
