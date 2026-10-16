export default defineMarkdownDocument({
  route: "/articles/:slug",
  llms: { title: "Public articles", description: "Document section description" },
  fetch: ({ params }) => (params.slug === "public" ? "SOURCE_MARKDOWN_BODY" : null),
  transform: (body) => ({ frontmatter: { title: "Public article" }, body }),
  list: (context) => {
    const event = context?.event;
    if (!event) throw new Error("Expected a Nitro request event");
    if (getHeader(event, "x-list-failure")) throw new Error("PRIVATE_LISTING_SECRET");
    const marker = getHeader(event, "x-list-marker") ?? "default";
    return [
      {
        title: `Public article ${marker}`,
        description: useRuntimeConfig(event).documentSummary,
        path: "/articles/public"
      }
    ];
  }
});
