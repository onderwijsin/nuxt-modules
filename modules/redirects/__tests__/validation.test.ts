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

  it("rejects unsafe origins and destinations", () => {
    expect(() => normalizeRedirect({ from: "old", to: "/new" })).toThrow("must start with");
    expect(() => normalizeRedirect({ from: "/old", to: "/new\nLocation: /other" })).toThrow(
      "must not contain newlines"
    );
  });
});
