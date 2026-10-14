import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineEventHandler(async () => {
  const definition = defineMarkdownDocument({
    route: "/sanity/markdown-documents",
    fetch: () => ({ title: "Public document" }),
    transform: (document) => ({ frontmatter: { title: document.title }, body: "# Public" })
  });
  const source = await definition.fetch({ params: {} });
  return { layer: "markdown-documents", title: source?.title };
});
