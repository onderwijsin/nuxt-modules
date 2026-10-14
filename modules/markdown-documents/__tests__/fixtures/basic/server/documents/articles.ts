export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch: ({ params }) => {
    if (params.slug === "failure") throw new Error("BACKEND_SECRET");
    return params.slug === "first" ? { title: "First article" } : null;
  },
  transform: (article) => ({
    frontmatter: { title: article.title },
    body: "SERVER_ONLY_ARTICLE_BODY_354"
  }),
  list: () => [{ title: "First article", path: "/articles/first" }]
});
