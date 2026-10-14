import { describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown documents server utilities", async () => {
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

  it("resolves structured documents, listings and URLs through generated server auto-imports", async () => {
    expect(await $fetch("/api/documents")).toEqual({
      document: { frontmatter: { title: "First article" }, body: "SERVER_ONLY_ARTICLE_BODY_354" },
      missing: null,
      entries: [{ title: "First article", path: "/articles/first" }],
      url: "/articles/first.md",
      rootURL: "/index.md"
    });
  });

  it("does not claim a raw document endpoint before delivery is implemented", async () => {
    expect((await fetch("/missing.md")).status).toBe(404);
  });
});
