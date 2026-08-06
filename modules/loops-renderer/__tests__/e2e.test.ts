import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("loops renderer module", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url))
  });

  it("renders registered LMX components with resolved variables and safe links", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Welcome Ada");
    expect(html).toContain('href="https://example.com/profile"');
    expect(html).toContain("View your profile");
  });
});
