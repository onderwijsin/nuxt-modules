import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("ui form extensions module", async () => {
  await setupFixture(import.meta.url);

  it("makes the draft form composable available to a Nuxt application", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("clean");
  });
});
