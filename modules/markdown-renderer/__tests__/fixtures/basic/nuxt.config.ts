import MarkdownRendererModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [MarkdownRendererModule],
  markdownRenderer: {
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { demo: ["MarkdownButton", "MarkdownCallout", "MarkdownHero"] }
  }
});
