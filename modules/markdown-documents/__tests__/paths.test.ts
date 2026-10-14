import { describe, expect, it } from "vitest";
import { parseDocumentPath } from "../src/runtime/server/paths";
import { createMarkdownDocumentService } from "../src/runtime/server/service";

describe("canonical document paths", () => {
  it("normalizes trailing slashes and equivalent Unicode encodings", () => {
    expect(parseDocumentPath("/")).toEqual({ path: "/", segments: [] });
    expect(parseDocumentPath("/articles/one///").path).toBe("/articles/one");
    expect(parseDocumentPath("/éducation/caf%C3%A9")).toEqual({
      path: "/%C3%A9ducation/caf%C3%A9",
      segments: ["éducation", "café"]
    });
    expect(parseDocumentPath("/discount/50%25").segments).toEqual(["discount", "50%"]);
  });

  it.each([
    "",
    "relative",
    "https://example.com/a",
    "//example.com/a",
    "/a\\b",
    "/a?token=secret",
    "/a#fragment",
    "/a//b",
    "/a/../b",
    "/a/./b",
    "/%2e%2e/b",
    "/a%2fb",
    "/a%5cb",
    "/%252e%252e/b",
    "/a%252fb",
    "/bad%",
    "/bad%GG",
    "/%C0%AF",
    "/%00",
    "/index",
    "/index/",
    "/article.md",
    "/article%2emd"
  ])("rejects unsafe or noncanonical input %s", (path) => {
    expect(() => parseDocumentPath(path)).toThrow();
  });

  it("is idempotent and decodes parameters only once", () => {
    for (const input of ["/éducation/caf%C3%A9", "/a/space%20here", "/a/50%25"]) {
      const first = parseDocumentPath(input);
      expect(parseDocumentPath(first.path)).toEqual(first);
    }
  });
});

describe("Markdown document URLs", () => {
  it.each([undefined, null])("uses no prefix for %s", (rawPrefix) => {
    const service = createMarkdownDocumentService([], { rawPrefix });
    expect(service.getMarkdownDocumentURL("/")).toBe("/index.md");
    expect(service.getMarkdownDocumentURL("/articles/one/")).toBe("/articles/one.md");
  });

  it("applies the configured base URL and prefix once", () => {
    const service = createMarkdownDocumentService([], { baseURL: "/docs/", rawPrefix: "/raw" });
    expect(service.getMarkdownDocumentURL("/")).toBe("/docs/raw/index.md");
    expect(service.getMarkdownDocumentURL("/articles/one")).toBe("/docs/raw/articles/one.md");
    expect(service.getMarkdownDocumentURL("/raw/one")).toBe("/docs/raw/raw/one.md");
    expect(service.getMarkdownDocumentURL("/éducation/café")).toBe(
      "/docs/raw/%C3%A9ducation/caf%C3%A9.md"
    );
    expect(
      createMarkdownDocumentService([], { baseURL: "/docs/" }).getMarkdownDocumentURL("/one")
    ).toBe("/docs/one.md");
  });
});
