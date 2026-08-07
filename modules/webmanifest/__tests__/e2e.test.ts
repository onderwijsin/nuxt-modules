import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("webmanifest module", async () => {
  await setup({ rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url)) });

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
