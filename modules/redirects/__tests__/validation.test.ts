import { describe, expect, it } from "vitest";

import { normalizeRedirect } from "../src/runtime/server/utils/validation";

describe("redirect validation", () => {
  it("normalizes a generic redirect record", () => {
    expect(normalizeRedirect({ from: "/old/?b=2&a=1", to: "/new" })).toEqual({
      from: "/old?a=1&b=2",
      to: "/new",
      statusCode: 302
    });
  });

  it("accepts internal paths and documented external destination forms", () => {
    for (const to of [
      "/new",
      "//cdn.example.com/new",
      "https://example.com/new",
      "http://example.com",
      "example.com/new"
    ]) {
      expect(normalizeRedirect({ from: "/old", to })).toMatchObject({ to });
    }
  });

  it("rejects unsafe origins, schemes, and control characters", () => {
    expect(() => normalizeRedirect({ from: "old", to: "/new" })).toThrow("must start with");
    for (const to of [
      "javascript:alert(1)",
      "data:text/html,unsafe",
      "mailto:redirect@example.com",
      "ftp://example.com/file",
      "https://",
      "//",
      "/new\nLocation: /other",
      "/new\u0000unsafe"
    ])
      expect(() => normalizeRedirect({ from: "/old", to })).toThrow("Redirect destinations");
  });
});
