import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("ui form extensions module", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url))
  });

  it("makes the draft form composable available to a Nuxt application", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("clean");
  });
});
