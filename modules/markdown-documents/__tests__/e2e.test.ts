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

  it("leaves unmatched raw URLs unclaimed", async () => {
    expect((await fetch("/missing.md")).status).toBe(404);
  });
  it("delivers YAML frontmatter and a Markdown body as plain text", async () => {
    const response = await fetch("/articles/first.md");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe(
      "---\ntitle: First article\n---\n\nSERVER_ONLY_ARTICLE_BODY_354"
    );
  });

  it("returns generic missing/error responses and rejects unsupported methods", async () => {
    expect((await fetch("/articles/private.md")).status).toBe(404);
    const failure = await fetch("/articles/failure.md");
    expect(failure.status).toBe(500);
    expect(await failure.text()).not.toContain("BACKEND_SECRET");
    for (const method of ["HEAD", "POST"]) {
      const response = await fetch("/articles/first.md", { method });
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    }
  });

  it("preserves neighboring raw routes and canonical HTML", async () => {
    expect(await $fetch("/neighbor.md")).toBe("Application-owned Markdown");
    expect(await $fetch("/articles/first")).toContain("Article HTML");
    expect(await $fetch("/index.md")).toBe("# Root document");
  });
});
