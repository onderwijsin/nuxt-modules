import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    componentsDir: fileURLToPath(new URL("./app/components/renderer", import.meta.url)),
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { sanity: ["MarkdownCallout"] }
  }
});
