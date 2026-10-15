export default defineMarkdownDocument({
  route: "/notes/:slug",
  async fetch() {
    return { title: "Async note", body: "SERVER_ONLY_NOTE_BODY_354" };
  },
  async transform(note) {
    return { frontmatter: { title: note.title }, body: note.body };
  }
});
