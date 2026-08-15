import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("static text module", async () => {
  await setupFixture(import.meta.url);

  it("renders dictionary lookups through the injected translator and auto-import", async () => {
    const html = await $fetch("/");

    expect(html).toContain("Create account");
    expect(html).toContain("Welcome Ada");
  });
});
