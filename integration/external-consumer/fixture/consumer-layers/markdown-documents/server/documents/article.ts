import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/sanity/markdown-documents",
  llms: { title: "Public pages", description: "Packed consumer pages" },
  fetch: () => ({ title: "Public document" }),
  transform: (document) => ({ frontmatter: { title: document.title }, body: "# Public" }),
  list: () => [{ title: "Public document", path: "/sanity/markdown-documents" }]
});
