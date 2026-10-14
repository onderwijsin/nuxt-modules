export default defineEventHandler(async () => {
  const definition = defineMarkdownDocument({
    route: "/sanity",
    fetch: () => ({ title: "Server helper available" }),
    transform: (document) => ({ frontmatter: { title: document.title }, body: "# Sanity" })
  });
  const source = await definition.fetch({ params: {} });
  return { route: definition.route, title: source?.title };
});
