import { describe, expect, it } from "vitest";
import { cacheOptionsSchema } from "../src/config/options.schema";

describe("cache option validation", () => {
  it("applies the public defaults", () => {
    expect(cacheOptionsSchema.parse({})).toMatchObject({
      enabled: false,
      adminHeaderName: "x-admin-token",
      devAuthBypass: false,
      maxInvalidatedEntries: 1_000
    });
  });

  it("rejects invalid administrator headers and invalidation limits", () => {
    expect(cacheOptionsSchema.safeParse({ adminHeaderName: " " }).success).toBe(false);
    expect(cacheOptionsSchema.safeParse({ maxInvalidatedEntries: 0 }).success).toBe(false);
    expect(cacheOptionsSchema.safeParse({ maxInvalidatedEntries: 10_001 }).success).toBe(false);
  });

  it("rejects unknown public options", () => {
    expect(cacheOptionsSchema.safeParse({ unexpected: true }).success).toBe(false);
  });
});
