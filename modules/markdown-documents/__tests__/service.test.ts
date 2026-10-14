import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";
import { defineMarkdownDocument } from "../src/runtime/server/index";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import type { MarkdownDocumentDefinition } from "../src/runtime/server/types";

/**
 * Defines a public article source with observable callbacks.
 * @param overrides Callbacks or route settings specific to a test.
 * @returns An inferred, consumer-owned definition.
 */
function article(overrides: Partial<MarkdownDocumentDefinition<{ title: string }>> = {}) {
  return defineMarkdownDocument({
    route: "/articles/:slug",
    fetch: vi.fn(() => ({ title: "Public article" })),
    transform: vi.fn((source: { title: string }) => ({
      frontmatter: { title: source.title },
      body: "# Public article"
    })),
    list: vi.fn(() => [{ title: "Public article", path: "/articles/one" }]),
    ...overrides
  });
}

/**
 * Binds an article definition to an application service.
 * @param definition Consumer-owned article definition.
 * @returns Service utilities for one registered definition.
 */
function serviceFor(definition: MarkdownDocumentDefinition<{ title: string }>) {
  return createMarkdownDocumentService([prepareDocumentDefinition(definition, "articles.ts")]);
}

describe("structured document resolution", () => {
  it("fetches and transforms directly without listing and passes decoded params plus context", async () => {
    const definition = article();
    const event = createTestEvent();
    const service = serviceFor(definition);
    expect(await service.resolveMarkdownDocument("/articles/caf%C3%A9/", { event })).toEqual({
      frontmatter: { title: "Public article" },
      body: "# Public article"
    });
    expect(definition.fetch).toHaveBeenCalledWith({ event, params: { slug: "café" } });
    expect(definition.transform).toHaveBeenCalledWith({ title: "Public article" });
    expect(definition.list).not.toHaveBeenCalled();
  });

  it("keeps unavailable documents distinct from failures and never transforms null", async () => {
    const definition = article({ fetch: vi.fn(() => null) });
    const service = serviceFor(definition);
    expect(await service.resolveMarkdownDocument("/articles/private")).toBeNull();
    expect(await service.resolveMarkdownDocument("/unmatched")).toBeNull();
    expect(definition.fetch).toHaveBeenCalledTimes(1);
    expect(definition.transform).not.toHaveBeenCalled();
    expect(definition.list).not.toHaveBeenCalled();
  });

  it("validates paths before calling consumer code", async () => {
    const definition = article();
    await expect(
      serviceFor(definition).resolveMarkdownDocument("/articles/%2Fsecret")
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(definition.fetch).not.toHaveBeenCalled();
  });

  it("supports independent local and asynchronous sources with static-route precedence", async () => {
    const dynamic = article();
    const local = defineMarkdownDocument({
      route: "/articles/about",
      fetch: () => "Local source",
      transform: (source) => ({ frontmatter: {}, body: source })
    });
    const remote = defineMarkdownDocument({
      route: "/notes/:slug",
      fetch: async () => ({ content: "Async source" }),
      transform: async (note) => ({
        frontmatter: { nested: { tags: ["one"] } },
        body: note.content
      })
    });
    const service = createMarkdownDocumentService([
      prepareDocumentDefinition(dynamic, "dynamic.ts"),
      prepareDocumentDefinition(local, "local.ts"),
      prepareDocumentDefinition(remote, "remote.ts")
    ]);
    expect(await service.resolveMarkdownDocument("/articles/about")).toEqual({
      frontmatter: {},
      body: "Local source"
    });
    expect(await service.resolveMarkdownDocument("/notes/one")).toEqual({
      frontmatter: { nested: { tags: ["one"] } },
      body: "Async source"
    });
    expect(dynamic.fetch).not.toHaveBeenCalled();
  });

  it("supports event-free resolution, root definitions and safe parameter keys", async () => {
    const definition = article({ route: "/:__proto__/:constructor" });
    await serviceFor(definition).resolveMarkdownDocument("/one/two");
    expect(definition.fetch).toHaveBeenCalledWith({
      params: { ["__proto__"]: "one", constructor: "two" }
    });
    const root = article({ route: "/" });
    expect(await serviceFor(root).resolveMarkdownDocument("/")).not.toBeNull();
  });

  it.each([new Error("private-token"), "private-token", null])(
    "sanitizes arbitrary fetch failures",
    async (error) => {
      const definition = article({ fetch: vi.fn().mockRejectedValue(error) });
      await expect(
        serviceFor(definition).resolveMarkdownDocument("/articles/one")
      ).rejects.toMatchObject({
        statusCode: 500,
        message: "Markdown document fetch failed in articles.ts."
      });
      expect(definition.transform).not.toHaveBeenCalled();
    }
  );

  it("sanitizes transform failures instead of returning null", async () => {
    const definition = article({
      transform: vi.fn().mockRejectedValue(new Error("private-source-payload"))
    });
    await expect(
      serviceFor(definition).resolveMarkdownDocument("/articles/one")
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Markdown document transform failed in articles.ts."
    });
  });

  it.each([
    undefined,
    null,
    { body: "missing metadata" },
    { frontmatter: [], body: "invalid" },
    { frontmatter: {}, body: 123 },
    { frontmatter: {}, body: "ok", extra: true }
  ])("rejects invalid transform output", async (value) => {
    const definition = article({ transform: vi.fn().mockResolvedValue(value) });
    await expect(
      serviceFor(definition).resolveMarkdownDocument("/articles/one")
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("sanitizes errors thrown while reading transform fields", async () => {
    const definition = article({
      transform: vi.fn().mockResolvedValue({
        frontmatter: {},
        get body() {
          throw new Error("private transform payload");
        }
      })
    });
    await expect(
      serviceFor(definition).resolveMarkdownDocument("/articles/one")
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.not.stringContaining("private transform payload")
    });
  });

  it("rejects undefined fetch results", async () => {
    const definition = article({ fetch: vi.fn().mockResolvedValue(undefined) });
    await expect(
      serviceFor(definition).resolveMarkdownDocument("/articles/one")
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(definition.transform).not.toHaveBeenCalled();
  });
});

describe("document metadata listing", () => {
  it("lists metadata without loading bodies and deduplicates normalized identical entries", async () => {
    const definition = article({
      list: vi.fn(() => [
        { title: "One", path: "/articles/one/", description: "Summary" },
        { title: "One", path: "/articles/one", description: "Summary" }
      ])
    });
    expect(await serviceFor(definition).listMarkdownDocuments()).toEqual([
      { title: "One", path: "/articles/one", description: "Summary" }
    ]);
    expect(definition.list).toHaveBeenCalledWith(undefined);
    expect(definition.fetch).not.toHaveBeenCalled();
    expect(definition.transform).not.toHaveBeenCalled();
  });

  it("returns only discovery metadata even when a source includes additional fields", async () => {
    const definition = article({
      list: () => [{ title: "One", path: "/articles/one", internal: "not public" }]
    });
    expect(await serviceFor(definition).listMarkdownDocuments()).toEqual([
      { title: "One", path: "/articles/one" }
    ]);
  });

  it("sanitizes errors thrown while reading listing metadata", async () => {
    const definition = article({
      list: vi.fn().mockResolvedValue([
        {
          get title() {
            throw new Error("private listing payload");
          },
          path: "/articles/one"
        }
      ])
    });
    await expect(serviceFor(definition).listMarkdownDocuments()).rejects.toMatchObject({
      statusCode: 500,
      message: expect.not.stringContaining("private listing payload")
    });
  });

  it("passes an optional listing context and skips types without listings", async () => {
    const definition = article();
    const event = createTestEvent();
    await serviceFor(definition).listMarkdownDocuments({ event });
    expect(definition.list).toHaveBeenCalledWith({ event });
    expect(await serviceFor(article({ list: undefined })).listMarkdownDocuments()).toEqual([]);
  });

  it.each(
    [
      [
        { title: "One", path: "/articles/one" },
        { title: "Different", path: "/articles/one" }
      ],
      [
        { title: "One", path: "/articles/one", description: "A" },
        { title: "One", path: "/articles/one", description: "B" }
      ],
      [{ title: " ", path: "/articles/one" }],
      [{ title: "One", path: "https://private.invalid" }],
      [{ title: "One", path: "/articles/%2e%2e/secret" }],
      [{ title: "One", path: "/unowned/one" }],
      ["/articles/one"],
      [{ title: "One", path: "/articles/one", description: 5 }]
    ].map((items) => ({ items }))
  )("rejects invalid or conflicting listing entries", async ({ items }) => {
    const definition = article({ list: vi.fn().mockResolvedValue(items) });
    await expect(serviceFor(definition).listMarkdownDocuments()).rejects.toMatchObject({
      statusCode: 500
    });
  });

  it("rejects a dynamic listing that claims a static definition's path", async () => {
    const dynamic = article({ list: () => [{ title: "About", path: "/articles/about" }] });
    const fixed = article({ route: "/articles/about", list: undefined });
    const service = createMarkdownDocumentService([
      prepareDocumentDefinition(dynamic, "dynamic.ts"),
      prepareDocumentDefinition(fixed, "fixed.ts")
    ]);
    await expect(service.listMarkdownDocuments()).rejects.toThrow(/unowned listing path/);
  });

  it("sanitizes listing failures without falling back to fetching bodies", async () => {
    const definition = article({ list: vi.fn().mockRejectedValue(new Error("privileged-token")) });
    await expect(serviceFor(definition).listMarkdownDocuments()).rejects.toMatchObject({
      statusCode: 500,
      message: "Markdown document list failed in articles.ts."
    });
    expect(definition.fetch).not.toHaveBeenCalled();
  });
});
