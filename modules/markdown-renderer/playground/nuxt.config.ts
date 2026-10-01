import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    resolveReferencePath: "~/utils/resolveReferencePath",
    componentSets: { demo: ["MarkdownButton", "MarkdownCallout", "MarkdownHero", "Reference"] }
  },
  appConfig: { packageName }
});
