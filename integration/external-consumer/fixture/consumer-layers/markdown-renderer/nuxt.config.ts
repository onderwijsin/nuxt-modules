export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    videoBaseUrl: "https://media.example.com/assets/",
    componentSets: { sanity: ["MarkdownCallout"] }
  }
});
