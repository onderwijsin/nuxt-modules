import MarkdownRendererModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [MarkdownRendererModule],
  markdownRenderer: {
    componentSets: { demo: ["MarkdownButton", "MarkdownCallout", "MarkdownHero"] }
  }
});
