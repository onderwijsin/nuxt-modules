import { findPublicArticle } from "../../utils/example-articles";

/**
 * Returns a published article for the playground's HTML reader.
 * @param event Incoming article request.
 * @returns Public article content and metadata.
 */
export default defineEventHandler(async (event) => {
  const article = await findPublicArticle(getRouterParam(event, "slug"));

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: "Article not found" });
  }

  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    author: article.author,
    tags: article.tags,
    readingMinutes: article.readingMinutes,
    featured: article.featured,
    related: article.related,
    body: article.body
  };
});
