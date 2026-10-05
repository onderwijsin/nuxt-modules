import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  appConfig: { ui: { prose: { p: { base: "markdown-prose-proof" } } } },
  markdownRenderer: {
    componentsDir: fileURLToPath(new URL("./app/components/renderer", import.meta.url)),
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { sanity: ["MarkdownCallout"] }
  }
});
