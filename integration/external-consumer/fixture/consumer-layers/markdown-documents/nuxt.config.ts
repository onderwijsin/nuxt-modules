import { readFileSync } from "node:fs";

const profile = JSON.parse(
  readFileSync(new URL("../../consumer-profile.json", import.meta.url), "utf8")
);

export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents", "nuxt-llms"],
  llms: {
    domain: "https://example.com",
    title: "Packed consumer documentation",
    full: { title: "Full documentation", description: "Packed Markdown documents" },
    sections: [{ title: "Existing section", links: [] }]
  },
  markdownDocuments: {
    enabled: true,
    rawPrefix: profile.markdownDocumentsPrefix ? "/raw" : null,
    dir: "consumer-layers/markdown-documents/server/documents"
  }
});
