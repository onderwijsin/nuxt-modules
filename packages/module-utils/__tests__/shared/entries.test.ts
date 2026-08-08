import { describe, expect, it } from "vitest";
import { fromEntries, toEntries } from "../../src/shared/entries";

describe("typed entry helpers", () => {
  it("returns typed object entries and rebuilds an object", () => {
    const entries = toEntries({ enabled: true, retries: 2 });

    expect(entries).toEqual([
      ["enabled", true],
      ["retries", 2]
    ]);
    expect(fromEntries(entries)).toEqual({ enabled: true, retries: 2 });
  });

  it("handles empty objects and iterable entries", () => {
    expect(toEntries({})).toEqual([]);
    expect(fromEntries(new Map([["name", "example"]]))).toEqual({ name: "example" });
  });
});
