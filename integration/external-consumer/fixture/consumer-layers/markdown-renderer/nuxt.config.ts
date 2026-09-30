export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: { componentSets: { sanity: ["MarkdownCallout"] } }
});
