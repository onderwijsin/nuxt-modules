import { describe, expect, it } from "vitest";

import { isRedirectActive } from "../src/runtime/utils/eligibility";

describe("redirect eligibility", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");

  it("uses inclusive activation and exclusive expiration bounds", () => {
    expect(
      isRedirectActive(
        {
          activeFrom: "2026-08-26T12:00:00.000Z",
          activeUntil: "2026-08-26T13:00:00.000Z"
        },
        now
      )
    ).toBe(true);
    expect(isRedirectActive({ activeUntil: now }, now)).toBe(false);
    expect(isRedirectActive({ activeFrom: now }, now)).toBe(true);
  });

  it("treats missing bounds as unbounded", () => {
    expect(isRedirectActive({}, now)).toBe(true);
    expect(isRedirectActive({ activeFrom: null, activeUntil: null }, now)).toBe(true);
  });
});
