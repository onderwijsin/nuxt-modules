import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("static text module", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url))
  });

  it("renders dictionary lookups through the injected translator and auto-import", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Create account");
    expect(html).toContain("Welcome Ada");
  });
});
