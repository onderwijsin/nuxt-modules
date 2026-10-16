export default defineMarkdownDocument({
  route: "/excluded",
  fetch: () => "Excluded body",
  transform: (body) => ({ frontmatter: {}, body }),
  list: () => {
    throw new Error("Definition without llms must not be listed");
  }
});
