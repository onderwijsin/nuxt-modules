import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { defineMarkdownDocument } from "../src/runtime/server/index";
import type { MarkdownDocument, MarkdownDocumentFetchContext } from "../src/runtime/server/index";

describe("defineMarkdownDocument", () => {
  it("preserves callbacks without fetching, transforming or listing during definition", () => {
    const fetch = vi.fn(() => ({ title: "Public article" }));
    const transform = vi.fn((article: { title: string }) => ({
      frontmatter: { title: article.title },
      body: "# Public"
    }));
    const list = vi.fn(() => []);
    const input = { route: "/articles/:slug", fetch, transform, list };
    expect(defineMarkdownDocument(input)).toBe(input);
    expect(fetch).not.toHaveBeenCalled();
    expect(transform).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("infers non-null asynchronous source data and permits event-free listing", async () => {
    const document = defineMarkdownDocument({
      route: "/articles/:slug",
      async fetch(context) {
        expectTypeOf(context).toEqualTypeOf<MarkdownDocumentFetchContext>();
        return context.params.slug ? { title: "Article", body: "Markdown" } : null;
      },
      async transform(article) {
        expectTypeOf(article).toEqualTypeOf<{ title: string; body: string }>();
        // @ts-expect-error Unknown fields must not become any through contextual inference.
        expectTypeOf(article.missing).toBeUnknown();
        return { frontmatter: { title: article.title }, body: article.body };
      },
      list: () => [{ title: "Article", path: "/articles/one" }]
    });
    expect(await document.list?.()).toEqual([{ title: "Article", path: "/articles/one" }]);
    expectTypeOf<
      Awaited<ReturnType<typeof document.transform>>
    >().toEqualTypeOf<MarkdownDocument>();
  });

  it("requires structured transform output and typed listings", () => {
    defineMarkdownDocument({
      route: "/invalid",
      fetch: () => ({ title: "Title" }),
      // @ts-expect-error A Markdown body must be a string.
      transform: () => ({ frontmatter: {}, body: 123 }),
      // @ts-expect-error Listings use structured metadata, not string paths.
      list: () => ["/invalid"]
    });
  });
});
