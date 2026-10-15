import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/sanity/markdown-documents",
  fetch: () => ({ title: "Public document" }),
  transform: (document) => ({ frontmatter: { title: document.title }, body: "# Public" }),
  list: () => [{ title: "Public document", path: "/sanity/markdown-documents" }]
});
