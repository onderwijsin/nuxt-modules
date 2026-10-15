import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";
import { createApp, defineEventHandler, type H3Event } from "h3";
import { attemptSync } from "@onderwijsin/nuxt-module-utils/shared";
import { registerMarkdownDocumentHandlers } from "../src/runtime/server/http";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import type { MarkdownDocumentServiceOptions } from "../src/runtime/server/types";

/** Creates a scoped delivery handler and observable consumer callback.
 * @param options URL configuration.
 * @param route Consumer route pattern.
 * @returns Handler, callback and scoped H3 application.
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
  const app = createApp();
  registerMarkdownDocumentHandlers(app, documents, service.resolveMarkdownDocument, options);
  return {
    fetch,
    app,
    documents,
    service,
    async handler(request: H3Event) {
      const target = request.node.req.url ?? "/";
      const path = attemptSync(() => decodeURI(target)).data ?? target;
      const matched = await app.resolve(path);
      return matched?.handler(request);
    }
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
    expect(await handler(request)).toBe("---\ntitle: café\n---\n\n# Public");
    expect(request.node.res.getHeader("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(fetch).toHaveBeenCalledWith({ params: { slug: "café" }, event: request });
  });
  it.each(["plain", "markdown"])(
    "uses the configured %s type regardless of request headers",
    async (format) => {
      const contentType = format === "markdown" ? "markdown" : "plain";
      const { handler } = fixture({ contentType });
      const request = event("/articles/one.md");
      const oppositeType = contentType === "plain" ? "text/markdown" : "text/plain";
      request.node.req.headers.accept = oppositeType;
      request.node.req.headers["content-type"] = oppositeType;
      request.node.res.setHeader("Vary", "Origin");
      expect(await handler(request)).toBe("---\ntitle: one\n---\n\n# Public");
      expect(request.node.res.getHeader("Content-Type")).toBe(`text/${contentType}; charset=utf-8`);
      expect(request.node.res.getHeader("Vary")).toBe("Origin");
    }
  );
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
  it("matches literal Unicode routes", async () => {
    const { handler } = fixture({}, "/café");
    expect(await handler(event("/caf%C3%A9.md"))).toContain("# Public");
  });
  it("registers scoped layers with an exact suffix and segment matcher", () => {
    const { app } = fixture();
    expect(app.stack).toHaveLength(1);
    expect(app.stack[0]?.route).toBe("/articles");
    expect(app.stack[0]?.match?.("/one.md")).toBe(true);
    expect(app.stack[0]?.match?.("/one")).toBe(false);
    expect(app.stack[0]?.match?.("/one/deep.md")).toBe(false);
  });
  it("keeps application middleware before document delivery and the native router after it", () => {
    const { documents, service } = fixture();
    const app = createApp();
    const middleware = defineEventHandler(() => undefined);
    const nativeRouter = defineEventHandler(() => "Native response");
    app.use(middleware);
    app.use(nativeRouter);
    registerMarkdownDocumentHandlers(
      app,
      documents,
      service.resolveMarkdownDocument,
      {},
      nativeRouter
    );
    expect(app.stack[0]?.handler).toBe(middleware);
    expect(app.stack[1]?.route).toBe("/articles");
    expect(app.stack[2]?.handler).toBe(nativeRouter);
  });
  it("matches parameters followed by literal segments without treating dots as wildcards", async () => {
    const { handler, fetch } = fixture({}, "/guides/:slug/details.v1");
    expect(await handler(event("/guides/one/details.v1.md"))).toContain("title: one");
    expect(await handler(event("/guides/one/detailsXv1.md"))).toBeUndefined();
    expect(await handler(event("/guides/one/details.v1"))).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
