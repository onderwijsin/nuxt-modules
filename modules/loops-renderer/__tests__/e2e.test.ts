import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";
import { readRendererBundles } from "./helpers/bundles";

describe("loops renderer module", async () => {
  await setupFixture(import.meta.url);

  it("renders registered LMX components with resolved variables and safe links", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Welcome Ada");
    expect(html).toContain('href="https://example.com/profile"');
    expect(html).toContain("View your profile");
    expect(html).toContain("color:var(--campaign-text)");
    expect(html).toContain("padding-top:16px");
    expect(html).toContain("color:#123457");
  });

  it("omits approximation from both bundles when the strategy is disabled", () => {
    for (const bundle of readRendererBundles()) {
      expect(bundle).not.toContain("4122214708");
      expect(bundle).not.toContain("maxDeltaE must be a finite");
      expect(bundle).toContain("Duplicate normalized source color");
    }
  });
});
