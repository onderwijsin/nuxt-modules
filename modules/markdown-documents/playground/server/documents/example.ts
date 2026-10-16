import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";
import { findPublicArticle, listPublicArticles } from "../utils/example-articles";

export default defineMarkdownDocument({
  route: "/articles/:slug",
  llms: {
    title: "Random articles for testing",
    description: `
    > This is a description

    With support for markdown
    `
  },
  fetch: ({ params }) => findPublicArticle(params.slug),
  transform: (article) => ({
    frontmatter: {
      title: article.title,
      description: article.description,
      publishedAt: article.publishedAt,
      author: article.author,
      tags: article.tags,
      readingMinutes: article.readingMinutes,
      featured: article.featured,
      expiresAt: null,
      related: article.related
    },
    body: article.body
  }),
  list: () => listPublicArticles()
});
