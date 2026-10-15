export default defineMarkdownDocument({
  route: "/café",
  fetch: () => true,
  transform: () => ({ frontmatter: {}, body: "# Unicode document" })
});
