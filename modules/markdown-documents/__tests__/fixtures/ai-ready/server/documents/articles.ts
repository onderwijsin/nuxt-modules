export default defineMarkdownDocument({
  route: "/articles/:slug",
  llms: { title: "Public articles", description: "Document section description" },
  fetch: ({ params }) => {
    if (params.slug === "failure") throw new Error("PRIVATE_FETCH_SECRET");
    return params.slug === "public" ? "SOURCE_MARKDOWN_BODY" : null;
  },
  transform: (body) => ({
    frontmatter: {
      title: "Public article",
      description: "Original document description",
      updatedAt: "2026-10-16T09:00:00Z",
      author: { name: "Alex", role: "Editor" },
      tags: ["Nuxt", "日本語"],
      featured: true,
      readingMinutes: 6,
      expiresAt: null
    },
    body
  }),
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
