export default defineEventHandler(async (event) => ({
  layer: "markdown-documents",
  document: await resolveMarkdownDocument("/sanity/markdown-documents", { event }),
  missing: await resolveMarkdownDocument("/sanity/markdown-documents/articles/private"),
  rootURL: getMarkdownDocumentURL("/"),
  entries: await listMarkdownDocuments(),
  url: getMarkdownDocumentURL("/sanity/markdown-documents")
}));
