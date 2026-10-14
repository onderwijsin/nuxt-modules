export default defineMarkdownDocument({
  route: "/",
  fetch: () => true,
  transform: () => ({ frontmatter: {}, body: "# Root document" })
});
