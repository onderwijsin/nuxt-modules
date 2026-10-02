import { describe, expect, it } from "vitest";

import { markdownRendererOptionsSchema } from "../src/config/options.schema";

describe("markdown renderer options", () => {
  it("scopes metadata by default and accepts the global opt-out", () => {
    expect(markdownRendererOptionsSchema.parse({}).scopeComponentMeta).toBe(true);
    expect(
      markdownRendererOptionsSchema.parse({ scopeComponentMeta: false }).scopeComponentMeta
    ).toBe(false);
    expect(markdownRendererOptionsSchema.safeParse({ scopeComponentMeta: "false" }).success).toBe(
      false
    );
  });

  it("allows metadata requests from every origin by default", () => {
    expect(markdownRendererOptionsSchema.parse({}).corsOrigin).toBe("*");
  });

  it("leaves video rewriting disabled by default", () => {
    expect(markdownRendererOptionsSchema.parse({}).videoBaseUrl).toBeUndefined();
  });

  it("accepts an absolute video base URL and rejects a relative path", () => {
    expect(
      markdownRendererOptionsSchema.parse({ videoBaseUrl: "https://media.example.com/assets/" })
        .videoBaseUrl
    ).toBe("https://media.example.com/assets/");
    expect(markdownRendererOptionsSchema.safeParse({ videoBaseUrl: "/assets/" }).success).toBe(
      false
    );
  });

  it("normalizes one configured origin to an allowlist", () => {
    expect(
      markdownRendererOptionsSchema.parse({ corsOrigin: "https://directus.example.com" }).corsOrigin
    ).toEqual(["https://directus.example.com"]);
  });

  it("preserves an origin allowlist", () => {
    expect(
      markdownRendererOptionsSchema.parse({
        corsOrigin: ["https://directus.example.com", "https://admin.example.com"]
      }).corsOrigin
    ).toEqual(["https://directus.example.com", "https://admin.example.com"]);
  });
});
