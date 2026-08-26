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

  it("normalizes redirect timing bounds to epoch milliseconds", () => {
    expect(
      normalizeRedirect({
        from: "/scheduled",
        to: "/new",
        activeFrom: "2026-08-26T12:00:00.000Z",
        activeUntil: "2026-08-26T13:00:00.000Z"
      })
    ).toMatchObject({
      activeFrom: Date.parse("2026-08-26T12:00:00.000Z"),
      activeUntil: Date.parse("2026-08-26T13:00:00.000Z")
    });
    expect(() =>
      normalizeRedirect({ from: "/scheduled", to: "/new", activeUntil: "invalid" })
    ).toThrow("activeUntil must be a valid date");
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

  it("accepts optional pattern segments and rejects query-bearing patterns", () => {
    expect(
      normalizeRedirect({
        from: "/guides/:version?/intro",
        to: "/docs/:version?/intro",
        match: "pattern"
      })
    ).toEqual({
      from: "/guides/:version?/intro",
      to: "/docs/:version?/intro",
      statusCode: 302,
      match: "pattern"
    });
    expect(
      normalizeRedirect({
        from: "/files/*?/download",
        to: "/downloads/*?/download",
        match: "pattern"
      })
    ).toMatchObject({ from: "/files/*?/download", match: "pattern" });
    expect(() =>
      normalizeRedirect({ from: "/legacy/:slug?source=old", to: "/docs/:slug", match: "pattern" })
    ).toThrow("must not contain query parameters");
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
