export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch: ({ params }) => (params.slug === "first" ? { title: "First article" } : null),
  transform: (article) => ({
    frontmatter: { title: article.title },
    body: "SERVER_ONLY_ARTICLE_BODY_354"
  }),
  list: () => [{ title: "First article", path: "/articles/first" }]
});
