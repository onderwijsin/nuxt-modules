import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: [
    "@onderwijsin/nuxt-markdown-documents",
    "@onderwijsin/nuxt-markdown-renderer",
    // "nuxt-llms",
    "nuxt-ai-ready",
    "@nuxtjs/sitemap"
  ],
  css: ["~/assets/main.css"],
  appConfig: { packageName },
  markdownDocuments: { enabled: true },
  // llms: {
  //   domain: "https://example.com",
  //   title: "My Application",
  //   full: { title: "Full documentation", description: "All public Markdown documents" },
  //   description: "My Application Description",
  //   sections: [
  //     {
  //       title: "Section 1",
  //       description: "Section 1 Description",
  //       links: [
  //         {
  //           title: "Index",
  //           description: "Link 1 Description",
  //           href: "/index.md"
  //         },
  //         {
  //           title: "Documents",
  //           description: "Link 2 Description",
  //           href: "/documents.md"
  //         }
  //       ]
  //     }
  //   ]
  // }

  aiReady: {
    llmsTxt: {
      markdownLinks: true
    },
    runtimeSync: {
      ttl: 3600, // Manual indexing freshness and sitemap refresh interval
      batchSize: 50, // Pages per batch
      pruneTtl: 0 // Prune routes not in sitemap (0 = never)
    },
    cron: true // Optional: scheduled background indexing (every 5 minutes)
  },

  site: {
    url: "https://example.com",
    name: "My Awesome Website"
  },

  sitemap: {
    urls: ["/a-nonexistent-page"]
  }
});
