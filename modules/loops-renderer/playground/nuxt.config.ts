import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  modules: ["@onderwijsin/nuxt-loops-renderer", "@nuxt/ui"],
  css: ["~/assets/main.css"],
  devtools: {
    enabled: true
  }
  // loopsRenderer: {
  //   applyInlineStyles: false
  // }
});
