import { describe, expect, it, vi } from "vitest";
import type { H3Event } from "h3";
import { createTestEvent } from "../../../packages/test-utils/src";
import { registerMarkdownDocumentLlms } from "../src/runtime/server/llms";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";

/** Creates definitions with request-aware listing and observable fetches.
 * @returns The service, callbacks, and typed hook dispatcher.
 */
function setup() {
  const list = vi.fn(() => [
    { title: "Article", description: "Summary", path: "/articles/one" },
    { title: "Unavailable", path: "/articles/missing" }
  ]);
  const fetch = vi.fn(({ params }: { params: Record<string, string> }) =>
    params.slug === "missing" ? null : "# Article body"
  );
  const hiddenList = vi.fn(() => []);
  const service = createMarkdownDocumentService(
    [
      prepareDocumentDefinition(
        {
          route: "/articles/:slug",
          llms: { title: "Articles", description: "Public articles" },
          fetch,
          transform: (body) => ({ frontmatter: { title: "Article" }, body }),
          list
        },
        "articles.ts"
      ),
      prepareDocumentDefinition(
        {
          route: "/",
          llms: { title: "Home", description: "Start here" },
          fetch: () => "# Home",
          transform: (body) => ({ frontmatter: {}, body }),
          list: () => [{ title: "Home", path: "/" }]
        },
        "home.ts"
      ),
      prepareDocumentDefinition(
        {
          route: "/hidden",
          fetch: () => null,
          transform: () => ({ frontmatter: {}, body: "" }),
          list: hiddenList
        },
        "hidden.ts"
      )
    ],
    { baseURL: "/app/", rawPrefix: "/raw" }
  );
  const hooks = {
    hook: vi.fn<
      (
        name: string,
        callback: (
          event: H3Event,
          options: { sections: { title: string }[] },
          contents: string[]
        ) => Promise<void>
      ) => void
    >()
  };
  registerMarkdownDocumentLlms(hooks, service);
  return { hooks, list, fetch, hiddenList };
}

describe("LLMS document integration", () => {
  it("appends per-definition sections and prefixed Markdown links without fetching bodies", async () => {
    const { hooks, list, fetch, hiddenList } = setup();
    const event = createTestEvent();
    const options = { sections: [{ title: "Existing" }] };
    const callback = hooks.hook.mock.calls.find(([name]) => name === "llms:generate")?.[1];
    if (!callback) throw new Error("Missing LLMS index hook");
    await callback(event, options, []);
    expect(options.sections).toEqual([
      { title: "Existing" },
      {
        title: "Articles",
        description: "Public articles",
        links: [
          { title: "Article", description: "Summary", href: "/app/raw/articles/one.md" },
          { title: "Unavailable", href: "/app/raw/articles/missing.md" }
        ]
      },
      {
        title: "Home",
        description: "Start here",
        links: [{ title: "Home", href: "/app/raw/index.md" }]
      }
    ]);
    expect(list).toHaveBeenCalledWith({ event });
    expect(fetch).not.toHaveBeenCalled();
    expect(hiddenList).not.toHaveBeenCalled();
  });

  it("includes serialized bodies in full output and skips unavailable documents", async () => {
    const { hooks, fetch } = setup();
    const event = createTestEvent();
    const contents = ["Existing content"];
    const callback = hooks.hook.mock.calls.find(([name]) => name === "llms:generate:full")?.[1];
    if (!callback) throw new Error("Missing LLMS full hook");
    await callback(event, { sections: [] }, contents);
    expect(contents).toEqual([
      "Existing content",
      "## Articles\n\nPublic articles\n\n---\ntitle: Article\n---\n\n# Article body",
      "## Home\n\nStart here\n\n# Home"
    ]);
    expect(fetch).toHaveBeenCalledWith({ event, params: { slug: "one" } });
  });
});
