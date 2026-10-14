import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch: ({ params }) => (params.slug === "example" ? { title: "Example document" } : null),
  transform: (document) => ({
    frontmatter: { title: document.title },
    body: "MARKDOWN_DOCUMENTS_SERVER_ONLY_FIXTURE"
  }),
  list: () => [{ title: "Example document", path: "/articles/example" }]
});
