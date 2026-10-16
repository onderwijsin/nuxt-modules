import { name as packageName } from "../package.json";

export default defineNuxtConfig({
  extends: ["playground-layer"],
  modules: ["@onderwijsin/nuxt-markdown-documents", "nuxt-llms"],
  appConfig: { packageName },
  markdownDocuments: { enabled: true },
  llms: {
    domain: "https://example.com",
    title: "My Application",
    full: { title: "Full documentation", description: "All public Markdown documents" },
    description: "My Application Description",
    sections: [
      {
        title: "Section 1",
        description: "Section 1 Description",
        links: [
          {
            title: "Index",
            description: "Link 1 Description",
            href: "/index.md"
          },
          {
            title: "Documents",
            description: "Link 2 Description",
            href: "/documents.md"
          }
        ]
      }
    ]
  }
});
