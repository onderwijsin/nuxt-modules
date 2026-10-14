export default defineEventHandler(async (event) => ({
  document: await resolveMarkdownDocument("/articles/first", { event }),
  missing: await resolveMarkdownDocument("/articles/private"),
  entries: await listMarkdownDocuments(),
  url: getMarkdownDocumentURL("/articles/first"),
  rootURL: getMarkdownDocumentURL("/")
}));
