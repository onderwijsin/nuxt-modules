import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("theme customizer module", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url))
  });

  it("serves the client-rendered theme page", async () => {
    const html = await $fetch("/thema");

    expect(html).toContain('id="__nuxt"');
  });

  it("serves configured font families without a Google Fonts API key", async () => {
    await expect($fetch("/api/theme/fonts?q=inter")).resolves.toEqual([
      { label: "Inter", value: "Inter" }
    ]);
  });
});
