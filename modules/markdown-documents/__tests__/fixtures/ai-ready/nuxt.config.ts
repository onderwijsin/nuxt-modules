import { fileURLToPath } from "node:url";
import markdownDocuments from "../../../src/module";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  // Use the already-declared optional integration dependency from the module's playground.
  modulesDir: [
    fileURLToPath(new URL("../../../playground/node_modules", import.meta.url)),
    "node_modules"
  ],
  modules: [markdownDocuments, "nuxt-ai-ready"],
  devtools: { enabled: false },
  site: { url: "https://example.com", name: "AI Ready integration fixture" },
  sitemap: { excludeAppSources: true, urls: [] },
  robots: { robotsTxt: false },
  aiReady: {
    database: false,
    llmsTxtCacheSeconds: 0,
    llmsTxt: {
      sections: [{ title: "Existing section", links: [{ title: "Support", href: "/support" }] }]
    }
  },
  runtimeConfig: { documentSummary: "Nitro runtime metadata" }
});
