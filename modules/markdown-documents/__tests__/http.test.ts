import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";
import { createMarkdownDocumentHandler } from "../src/runtime/server/http";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import type { MarkdownDocumentServiceOptions } from "../src/runtime/server/types";

/** Creates a scoped delivery handler and observable consumer callback.
 * @param options URL configuration.
 * @param route Consumer route pattern.
 * @returns Handler, callback and prepared definition for collision tests.
 */
function fixture(options: MarkdownDocumentServiceOptions = {}, route = "/articles/:slug") {
  const fetch = vi.fn(({ params }: { params: Record<string, string> }) => {
    if (params.slug === "private") return null;
    if (params.slug === "failure") throw new Error("BACKEND_SECRET");
    return { title: params.slug ?? "Root" };
  });
  const documents = [
    prepareDocumentDefinition(
      {
        route,
        fetch,
        transform: (source) => ({ frontmatter: { title: source.title }, body: "# Public" })
      },
      "articles.ts"
    )
  ];
  const service = createMarkdownDocumentService(documents, options);
  return {
    fetch,
    documents,
    service,
    handler: createMarkdownDocumentHandler(documents, service.resolveMarkdownDocument, options)
  };
}

/** Constructs a request event without normalizing the raw request target.
 * @param target Original request target.
 * @param method HTTP method.
 * @returns H3 event for direct handler calls.
 */
function event(target: string, method = "GET") {
  const result = createTestEvent();
  result.node.req.url = target;
  result.node.req.method = method;
  return result;
}

describe("scoped Markdown delivery", () => {
  it("serves plain text and passes the request context to fetch", async () => {
    const { handler, fetch } = fixture();
    const request = event("/articles/caf%C3%A9.md");
    expect(await handler(request)).toBe("---\ntitle: café\n---\n# Public");
    expect(request.node.res.getHeader("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(fetch).toHaveBeenCalledWith({ params: { slug: "café" }, event: request });
  });
  it.each(["/articles/one", "/neighbor.md", "/api/example", "/articles/deep/one.md"])(
    "passes through unrelated URL %s",
    async (path) => {
      const { handler, fetch } = fixture();
      expect(await handler(event(path))).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it.each(["HEAD", "POST", "PUT", "DELETE", "OPTIONS"])(
    "rejects %s without fetching",
    async (method) => {
      const { handler, fetch } = fixture();
      const request = event("/articles/one.md", method);
      await expect(handler(request)).rejects.toMatchObject({ statusCode: 405 });
      expect(request.node.res.getHeader("Allow")).toBe("GET");
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it.each(["%2F", "%2E%2E", "%252F", "%", "a%5Cb", "%00"])(
    "rejects unsafe parameter %s before fetching",
    async (slug) => {
      const { handler, fetch } = fixture();
      await expect(handler(event(`/articles/${slug}.md`))).rejects.toMatchObject({
        statusCode: 400
      });
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it("distinguishes unavailable content from provider errors without leaking diagnostics", async () => {
    const { handler } = fixture();
    await expect(handler(event("/articles/private.md"))).rejects.toMatchObject({
      statusCode: 404,
      message: "Not Found"
    });
    await expect(handler(event("/articles/failure.md"))).rejects.toMatchObject({
      statusCode: 500,
      message: "Document retrieval failed"
    });
  });
  it("applies baseURL, explicit prefix and root mapping once", async () => {
    const { handler, fetch } = fixture({ baseURL: "/docs/", rawPrefix: "/raw" }, "/");
    expect(await handler(event("/docs/raw/index.md"))).toContain("title: Root");
    expect(await handler(event("/raw/index.md"))).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["/articles/first.md", "/articles/:id.md", "/articles/:slug().md"])(
    "rejects explicit route ownership conflicts with %s",
    (route) => {
      const { documents, service } = fixture();
      expect(() =>
        createMarkdownDocumentHandler(documents, service.resolveMarkdownDocument, {}, [
          { route, source: "existing.ts" }
        ])
      ).toThrow(/articles.ts.*existing.ts/);
    }
  );
  it("detects overlapping parameters in different segments", () => {
    const { documents, service } = fixture({}, "/a/:id");
    expect(() =>
      createMarkdownDocumentHandler(documents, service.resolveMarkdownDocument, {}, [
        { route: "/:id/b.md", source: "page.vue" }
      ])
    ).toThrow(/conflicts/);
  });
  it("matches literal Unicode routes and detects their ownership conflicts", async () => {
    const { documents, service, handler } = fixture({}, "/café");
    expect(await handler(event("/caf%C3%A9.md"))).toContain("# Public");
    expect(() =>
      createMarkdownDocumentHandler(documents, service.resolveMarkdownDocument, {}, [
        { route: "/café.md", source: "page.vue" }
      ])
    ).toThrow(/conflicts/);
  });
});
