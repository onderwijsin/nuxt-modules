import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/",
  fetch: () => true,
  transform: () => ({ frontmatter: {}, body: "# Packed root document" })
});
