import directusModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [directusModule],
  directus: {
    baseUrl: process.env.DIRECTUS_E2E_URL ?? "https://sandbox.directus.com",
    commands: ["readItems"],
    auth: { enabled: true, cookie: { secure: false } },
    typegen: { enabled: false }
  }
});
