import { describe, expect, it } from "vitest";
import { markdownDocumentsOptionsSchema } from "../src/config/options.schema";

describe("markdown document options", () => {
  it("leaves the prefix unset by default and accepts an explicit null prefix", () => {
    expect(markdownDocumentsOptionsSchema.parse({})).toEqual({
      enabled: true,
      dir: "server/documents",
      prerender: false
    });
    expect(
      markdownDocumentsOptionsSchema.parse({ rawPrefix: undefined }).rawPrefix
    ).toBeUndefined();
    expect(markdownDocumentsOptionsSchema.parse({ rawPrefix: "/raw" }).rawPrefix).toBe("/raw");
    expect(markdownDocumentsOptionsSchema.parse({ rawPrefix: null }).rawPrefix).toBeNull();
    expect(
      markdownDocumentsOptionsSchema.parse({
        rawPrefix: "/exports/raw",
        dir: "backend/documents",
        prerender: true
      })
    ).toMatchObject({ dir: "backend/documents", rawPrefix: "/exports/raw", prerender: true });
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
