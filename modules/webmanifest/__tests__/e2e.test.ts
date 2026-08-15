import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("webmanifest module", async () => {
  await setupFixture(import.meta.url);

  it("serves the generated manifest and links it from the document head", async () => {
    const manifest = await $fetch<Record<string, unknown>>("/app.webmanifest");
    expect(manifest.name).toBe("Fixture app");
    expect(manifest.description).toBe("A fixture application");
    expect(manifest.icons).toEqual([
      { src: "/brand-icon.png", sizes: "512x512", type: "image/png" }
    ]);

    const html = await $fetch<string>("/");
    expect(html).toContain('<link rel="manifest" href="/app.webmanifest">');
  });
});
