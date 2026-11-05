import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";
import { readRendererBundles } from "./helpers/bundles";

describe("opt-in source color approximation", async () => {
  await setupFixture(import.meta.url, "approximation");

  it("uses exact matches and nearest-source fallbacks during SSR", async () => {
    const html = await $fetch("/");
    expect(html.match(/color:var\(--campaign-text\)/g)).toHaveLength(2);
    expect(html).not.toContain("color:#123457");
    expect(html).toContain("Near color");
  });

  it("includes source color-distance mathematics in enabled client and server builds", () => {
    for (const bundle of readRendererBundles()) {
      expect(bundle).toContain("4122214708");
      expect(bundle).toContain("maxDeltaE must be a finite");
    }
  });
});
