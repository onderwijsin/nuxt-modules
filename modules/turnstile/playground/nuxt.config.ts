import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-turnstile", "@nuxt/ui"],
  css: ["~/assets/main.css"],
  turnstile: { siteKey: "1x00000000000000000000AA", secretKey: "" }
});
