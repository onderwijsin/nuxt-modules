import { readFileSync } from "node:fs";

const profile = JSON.parse(
  readFileSync(new URL("../../consumer-profile.json", import.meta.url), "utf8")
);

export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: {
    enabled: true,
    rawPrefix: profile.markdownDocumentsPrefix ? "/raw" : null,
    dir: "consumer-layers/markdown-documents/server/documents"
  }
});
