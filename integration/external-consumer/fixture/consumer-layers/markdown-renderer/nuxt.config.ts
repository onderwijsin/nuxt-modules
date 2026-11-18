import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  appConfig: { ui: { prose: { p: { base: "markdown-prose-proof" } } } },
  markdownRenderer: {
    referenceConfig: {
      linkResolver: fileURLToPath(new URL("./app/utils/resolveReferencePath.ts", import.meta.url))
    },
    relatedItemListConfig: {
      mapItem: fileURLToPath(new URL("./app/utils/mapRelatedItem.ts", import.meta.url)),
      linkResolver: fileURLToPath(new URL("./app/utils/resolveRelatedItemPath.ts", import.meta.url))
    },
    componentsDir: fileURLToPath(new URL("./app/components/renderer", import.meta.url)),
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { sanity: ["ItemList", "MarkdownAnchor", "MarkdownCallout"] }
  }
});
