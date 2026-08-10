import { describe, expect, it, vi } from "vitest";

vi.mock("nitropack/runtime", () => ({
  useNitroApp: vi.fn(),
  useStorage: vi.fn()
}));

import { hashRedirectLookupOrigin } from "../src/runtime/server/utils/cache";

describe("redirect lookup cache keys", () => {
  it("keeps distinct origins distinct after Nitro key normalization", () => {
    const dashed = hashRedirectLookupOrigin("/foo-bar");
    const undashed = hashRedirectLookupOrigin("/foobar");

    expect(dashed).not.toBe(undashed);
    expect(dashed).toMatch(/^\w+$/);
    expect(undashed).toMatch(/^\w+$/);
  });

  it("includes the exact normalized query origin in the hash", () => {
    expect(hashRedirectLookupOrigin("/search?a=1")).not.toBe(
      hashRedirectLookupOrigin("/search?a=2")
    );
  });
});
