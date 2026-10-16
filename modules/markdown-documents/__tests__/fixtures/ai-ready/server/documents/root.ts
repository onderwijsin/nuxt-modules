export default defineMarkdownDocument({
  route: "/",
  llms: { title: "Home document", description: "Root mapping" },
  fetch: () => "# Root source",
  transform: (body) => ({ frontmatter: {}, body }),
  list: () => [{ title: "Home", path: "/" }]
});
