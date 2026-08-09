import { describe, expect, it } from "vitest";

import {
  toRedirectOrigin,
  toRedirectPath,
  toRedirectStorageKey
} from "../src/runtime/server/utils/path";

describe("redirect origin keys", () => {
  it("normalizes trailing slashes and query parameter order", () => {
    expect(toRedirectOrigin("/old/?z=2&a=1")).toBe("/old?a=1&z=2");
    expect(toRedirectOrigin("/old?a=1&z=2")).toBe("/old?a=1&z=2");
  });

  it("keeps path-only fallback keys separate from exact query keys", () => {
    expect(toRedirectPath("/old?campaign=spring")).toBe("/old");
    expect(toRedirectStorageKey("/old?campaign=spring")).not.toBe(toRedirectStorageKey("/old"));
  });
});
