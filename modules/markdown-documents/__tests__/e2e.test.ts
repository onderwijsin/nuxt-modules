import { describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown documents scaffold", async () => {
  await setupFixture(import.meta.url);

  it("loads in Nuxt and preserves the application HTML route", async () => {
    expect(await $fetch<string>("/")).toContain("Markdown documents fixture");
  });

  it("makes the definition helper available as a server auto-import", async () => {
    expect(await $fetch("/api/definition")).toEqual({
      route: "/sanity",
      title: "Server helper available"
    });
  });

  it("does not claim a raw document endpoint before delivery is implemented", async () => {
    expect((await fetch("/missing.md")).status).toBe(404);
  });
});
