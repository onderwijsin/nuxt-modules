import { describe, expect, it } from "vitest";
import { markdownDocumentsOptionsSchema } from "../src/config/options.schema";

describe("markdown document options", () => {
  it("leaves the prefix unset by default and accepts an explicit null prefix", () => {
    expect(markdownDocumentsOptionsSchema.parse({})).toEqual({
      enabled: true,
      dir: "server/documents",
      contentType: "plain"
    });
    expect(
      markdownDocumentsOptionsSchema.parse({ rawPrefix: undefined }).rawPrefix
    ).toBeUndefined();
    expect(markdownDocumentsOptionsSchema.parse({ rawPrefix: "/raw" }).rawPrefix).toBe("/raw");
    expect(markdownDocumentsOptionsSchema.parse({ rawPrefix: null }).rawPrefix).toBeNull();
    expect(
      markdownDocumentsOptionsSchema.parse({
        rawPrefix: "/exports/raw",
        dir: "backend/documents"
      })
    ).toMatchObject({ dir: "backend/documents", rawPrefix: "/exports/raw" });
  });

  it("rejects the removed prerender option instead of accepting a no-op", () => {
    expect(markdownDocumentsOptionsSchema.safeParse({ prerender: true }).success).toBe(false);
  });

  it("accepts both response types and rejects unsupported values", () => {
    expect(markdownDocumentsOptionsSchema.parse({ contentType: "markdown" }).contentType).toBe(
      "markdown"
    );
    expect(markdownDocumentsOptionsSchema.parse({ contentType: "plain" }).contentType).toBe(
      "plain"
    );
    expect(markdownDocumentsOptionsSchema.safeParse({ contentType: "text/plain" }).success).toBe(
      false
    );
  });

  it.each([
    "",
    "/",
    "raw",
    "//raw",
    "/raw/",
    "/../raw",
    "/raw?x=1",
    "/raw/:slug",
    "https://example.com",
    "/raw%2fdocs"
  ])("rejects invalid prefix %s", (rawPrefix) => {
    expect(markdownDocumentsOptionsSchema.safeParse({ rawPrefix }).success).toBe(false);
  });

  it.each([
    "",
    " ",
    "/absolute",
    "../documents",
    "server/../documents",
    "server\\documents",
    "server//documents",
    "C:/documents"
  ])("rejects invalid directory %s", (dir) => {
    expect(markdownDocumentsOptionsSchema.safeParse({ dir }).success).toBe(false);
  });

  it("rejects invalid booleans and unknown option names", () => {
    expect(markdownDocumentsOptionsSchema.safeParse({ enabled: "false" }).success).toBe(false);
    expect(markdownDocumentsOptionsSchema.safeParse({ rawPrefx: null }).success).toBe(false);
  });
});
