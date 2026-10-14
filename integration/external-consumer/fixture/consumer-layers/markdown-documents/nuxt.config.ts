export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: {
    enabled: true,
    rawPrefix: null,
    dir: "consumer-layers/markdown-documents/server/documents"
  }
});
