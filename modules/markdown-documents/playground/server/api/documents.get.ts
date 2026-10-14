export default defineEventHandler(async (event) => ({
  document: await resolveMarkdownDocument("/articles/example", { event }),
  entries: await listMarkdownDocuments(),
  url: getMarkdownDocumentURL("/articles/example")
}));
