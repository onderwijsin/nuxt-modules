import { describe, expect, it } from "vitest";
import { fromEntries, keys, toEntries } from "../../src/shared/object";

describe("typed object helpers", () => {
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

  it("returns typed enumerable own keys", () => {
    expect(keys({ enabled: true, retries: 2 })).toEqual(["enabled", "retries"]);
    expect(keys({})).toEqual([]);
  });
});
