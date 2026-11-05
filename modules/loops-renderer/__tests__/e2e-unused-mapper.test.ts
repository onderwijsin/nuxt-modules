import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";
import { readRendererBundles } from "./helpers/bundles";

describe("unused mapping utility", async () => {
  await setupFixture(import.meta.url, "unused-mapper");

  it("preserves authored output without importing the mapper or enabled strategy", async () => {
    expect(await $fetch("/")).toContain("color:#123456");
    for (const bundle of readRendererBundles()) {
      expect(bundle).not.toContain("4122214708");
      expect(bundle).not.toContain("maxDeltaE must be a finite");
      expect(bundle).not.toContain("Duplicate normalized source color");
    }
  });
});
