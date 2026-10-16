import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/sanity/markdown-documents/articles/:slug",
  llms: { title: "Public articles", description: "Packed consumer articles" },
  async fetch({ params }) {
    if (params.slug === "failure") throw new Error("PACKED_PROVIDER_SECRET_354");
    return params.slug === "public" ? { title: "Public article" } : null;
  },
  transform: (article) => ({
    frontmatter: {
      title: article.title,
      author: { name: "Example author" },
      tags: ["Nuxt"],
      published: true
    },
    body: "# Packed article"
  }),
  list: () => [
    {
      title: "Public article",
      description: "Article summary",
      path: "/sanity/markdown-documents/articles/public"
    }
  ]
});
