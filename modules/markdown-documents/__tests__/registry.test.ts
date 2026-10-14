import { describe, expect, it, vi } from "vitest";
import { parseDocumentRoute, validateDocumentDefinitions } from "../src/runtime/server/registry";

/** Creates a source entry without invoking consumer callbacks.
 * @param route Canonical route pattern.
 * @param source Diagnostic filename.
 * @returns The source entry and uncalled callbacks.
 */
function entry(route: string, source = `${route}.ts`) {
  return { source, definition: { route, fetch: vi.fn(), transform: vi.fn() } };
}

describe("document route grammar and registry", () => {
  it("accepts root, Unicode literals and named single-segment parameters", () => {
    expect(parseDocumentRoute("/")).toEqual([]);
    expect(parseDocumentRoute("/éducation/:article_slug")).toEqual(["éducation", ":article_slug"]);
  });

  it.each([
    "",
    "relative",
    "//external",
    "/a/",
    "/:bad-name",
    "/:id/:id",
    "/a/**",
    "/a/:id?",
    "/a#x",
    "/a?x",
    "/..",
    "/a/%2e%2e",
    "/a\\b",
    "/index",
    "/a.md"
  ])("rejects invalid pattern %s", (route) => {
    expect(() => parseDocumentRoute(route)).toThrow();
  });

  it("places static routes first without executing consumer code", () => {
    const dynamic = entry("/blog/:slug");
    const fixed = entry("/blog/about");
    expect(validateDocumentDefinitions([dynamic, fixed])).toEqual([fixed, dynamic]);
    expect(dynamic.definition.fetch).not.toHaveBeenCalled();
    expect(dynamic.definition.transform).not.toHaveBeenCalled();
  });

  it.each([
    ["/blog/:slug", "/blog/:id"],
    ["/a/:id", "/:slug/a"],
    ["/fixed", "/fixed"],
    ["/", "/"]
  ])("rejects ambiguous %s and %s with both source filenames", (first, second) => {
    expect(() =>
      validateDocumentDefinitions([entry(first, "first.ts"), entry(second, "second.ts")])
    ).toThrow(/first.ts.*second.ts/);
  });

  it("allows separate routes with equal specificity and names invalid sources", () => {
    expect(validateDocumentDefinitions([entry("/a/:id"), entry("/b/:id")])).toHaveLength(2);
    expect(() => validateDocumentDefinitions([entry("/a/**", "broken.ts")])).toThrow(/broken.ts/);
    expect(() =>
      validateDocumentDefinitions([{ source: "missing-fetch.ts", definition: { route: "/ok" } }])
    ).toThrow(/missing-fetch.ts/);
  });
});
