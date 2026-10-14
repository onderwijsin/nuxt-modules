export default defineEventHandler(async (event) => ({
  layer: "markdown-documents",
  document: await resolveMarkdownDocument("/sanity/markdown-documents", { event }),
  entries: await listMarkdownDocuments(),
  url: getMarkdownDocumentURL("/sanity/markdown-documents")
}));
