import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { createTestEvent } from "../../../packages/test-utils/src";
import {
  registerMarkdownDocumentAiReadyMarkdown,
  registerMarkdownDocumentAiReadySource
} from "../src/runtime/server/ai-ready-content";
import type {
  MarkdownSourceContext,
  PageMarkdownContext
} from "../src/runtime/server/ai-ready-content";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import type { MarkdownDocumentServiceOptions } from "../src/runtime/server/types";

/**
 * Registers content adapters against a real document service and observable callbacks.
 * @param options Application base URL and raw prefix.
 * @returns Source and conversion callbacks, plus the consumer fetch and listing spies.
 */
function setup(options: MarkdownDocumentServiceOptions = {}) {
  const fetch = vi.fn(({ params }: { params: Record<string, string> }) => {
    if (params.slug === "failure") throw new Error("PRIVATE_FETCH_SECRET");
    return params.slug === "public" ? "# Original Markdown\n\n**Original text**" : null;
  });
  const list = vi.fn(() => []);
  const frontmatter = {
    title: "Original title",
    description: "Original description",
    updatedAt: "2026-10-16T09:00:00Z",
    author: { name: "Alex", role: "Editor" },
    tags: ["Nuxt", "日本語"],
    featured: true,
    readingMinutes: 6,
    expiresAt: null
  };
  const service = createMarkdownDocumentService(
    [
      prepareDocumentDefinition(
        {
          route: "/articles/:slug",
          fetch,
          transform: (body) => ({ frontmatter, body }),
          list
        },
        "articles.ts"
      ),
      prepareDocumentDefinition(
        {
          route: "/",
          fetch: () => true,
          transform: () => ({ frontmatter: {}, body: "# Root source" })
        },
        "root.ts"
      )
    ],
    options
  );
  const sourceHooks = {
    hook: vi.fn<
      (
        name: "ai-ready:markdown:source",
        callback: (context: MarkdownSourceContext) => Promise<void>
      ) => void
    >()
  };
  const markdownHooks = {
    hook: vi.fn<
      (
        name: "ai-ready:page:markdown",
        callback: (context: PageMarkdownContext) => Promise<void>
      ) => void
    >()
  };
  registerMarkdownDocumentAiReadySource(sourceHooks, service, options);
  registerMarkdownDocumentAiReadyMarkdown(markdownHooks, service);
  const source = sourceHooks.hook.mock.calls[0]?.[1];
  const markdown = markdownHooks.hook.mock.calls[0]?.[1];
  if (!source || !markdown) throw new Error("Missing content hook");
  return { source, markdown, fetch, list, frontmatter };
}

describe("AI Ready original Markdown content", () => {
  it.each([
    { options: {}, route: "/articles/public" },
    { options: { baseURL: "/docs/" }, route: "/docs/articles/public" },
    { options: { rawPrefix: "/raw" }, route: "/raw/articles/public" },
    { options: { baseURL: "/docs/", rawPrefix: "/raw" }, route: "/docs/raw/articles/public" }
  ])(
    "supplies original Markdown with arbitrary metadata for $route",
    async ({ options, route }) => {
      const { source, fetch, list, frontmatter } = setup(options);
      const event = createTestEvent();
      const context: MarkdownSourceContext = { route, event, source: null };
      await source(context);
      expect(context.source).toMatchObject({
        title: frontmatter.title,
        description: frontmatter.description,
        updatedAt: frontmatter.updatedAt
      });
      expect(context.source?.markdown).toContain("# Original Markdown\n\n**Original text**");
      const metadata = /^---\n([\s\S]*?)\n---\n/.exec(context.source?.markdown ?? "");
      expect(metadata).not.toBeNull();
      expect(parse(metadata?.[1] ?? "")).toEqual(frontmatter);
      expect(fetch).toHaveBeenCalledWith({ event, params: { slug: "public" } });
      expect(list).not.toHaveBeenCalled();
    }
  );

  it.each(["/unknown", "/articles/draft"])(
    "leaves another source untouched for %s",
    async (route) => {
      const { source } = setup();
      const existing = { markdown: "Another provider's Markdown" };
      const context: MarkdownSourceContext = { route, event: createTestEvent(), source: existing };
      await source(context);
      expect(context.source).toBe(existing);
    }
  );

  it("supplies root documents without requiring metadata", async () => {
    const { source } = setup({ baseURL: "/docs/", rawPrefix: "/raw" });
    const context: MarkdownSourceContext = {
      route: "/docs/raw/",
      event: createTestEvent(),
      source: null
    };
    await source(context);
    expect(context.source).toEqual({ markdown: "# Root source" });
  });

  it("propagates sanitized source failures instead of falling back to HTML", async () => {
    const { source } = setup();
    const context: MarkdownSourceContext = {
      route: "/articles/failure",
      event: createTestEvent(),
      source: null
    };
    await expect(source(context)).rejects.toThrow("Markdown document fetch failed in articles.ts.");
    expect(context.source).toBeNull();
  });

  it.each([
    { label: "request-time", event: createTestEvent() },
    { label: "event-free", event: undefined }
  ])("replaces converted Markdown in a $label context", async ({ event }) => {
    const { markdown, fetch, list } = setup();
    const context = { route: "/articles/public", event, markdown: "# HTML conversion" };
    await markdown(context);
    expect(context.markdown).toContain("# Original Markdown\n\n**Original text**");
    expect(context.markdown).not.toContain("HTML conversion");
    expect(context.markdown).toContain("author:");
    expect(fetch).toHaveBeenCalledWith({ event, params: { slug: "public" } });
    expect(list).not.toHaveBeenCalled();
  });

  it.each(["/unknown", "/articles/draft"])("preserves converted output for %s", async (route) => {
    const { markdown } = setup();
    const context = { route, markdown: "# HTML conversion" };
    await markdown(context);
    expect(context.markdown).toBe("# HTML conversion");
  });
});
