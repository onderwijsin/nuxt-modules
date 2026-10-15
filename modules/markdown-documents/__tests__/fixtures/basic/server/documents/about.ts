import { defineMarkdownDocument } from "../../../../../src/runtime/server/index";

export default defineMarkdownDocument({
  route: "/about",
  fetch: () => ({ title: "About" }),
  transform: (page) => ({ frontmatter: { title: page.title }, body: "SERVER_ONLY_ABOUT_BODY_354" })
});
