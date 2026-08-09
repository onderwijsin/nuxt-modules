import { describe, expect, it } from "vitest";
import { $fetch } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("loops renderer module", async () => {
  await setupFixture(import.meta.url);

  it("renders registered LMX components with resolved variables and safe links", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Welcome Ada");
    expect(html).toContain('href="https://example.com/profile"');
    expect(html).toContain("View your profile");
  });
});
