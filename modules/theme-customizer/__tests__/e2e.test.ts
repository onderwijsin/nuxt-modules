import { describe, expect, it } from "vitest";
import { $fetch } from "@nuxt/test-utils/e2e";
import { setupFixture } from "../../../packages/test-utils/src";

describe("theme customizer module", async () => {
  await setupFixture(import.meta.url);

  it("serves the client-rendered theme page", async () => {
    const html = await $fetch("/thema");

    expect(html).toContain('id="__nuxt"');
  });

  it("serves configured font families without a Google Fonts API key", async () => {
    await expect($fetch("/api/_theme-customizer/fonts?q=inter")).resolves.toEqual([
      { label: "Inter", value: "Inter" }
    ]);
  });
});
