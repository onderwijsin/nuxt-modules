import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

describe("AI Ready llms.txt integration", async () => {
  await setupFixture(import.meta.url, "ai-ready");

  it("includes document metadata alongside configured sections in the real AI Ready response", async () => {
    const response = await fetch("/llms.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("# AI Ready integration fixture");
    expect(body).toContain("## Existing section\n\n- [Support](/support)");
    expect(body).toContain(
      "## Public articles\n\n- [Public article default](/articles/public.md): Nitro runtime metadata"
    );
    expect(body).toContain("**Public articles:**\n\nDocument section description");
    expect(body).toContain("- [Home](/index.md)");
    expect(body).not.toContain("SOURCE_MARKDOWN_BODY");
    expect(body).not.toContain("/articles/draft");
    expect(body).not.toContain("/excluded");
  });

  it("forwards each request event without leaking metadata or duplicating sections between requests", async () => {
    const first = await $fetch<string>("/llms.txt", { headers: { "x-list-marker": "first" } });
    const second = await $fetch<string>("/llms.txt", { headers: { "x-list-marker": "second" } });
    expect(first).toContain("[Public article first]");
    expect(second).toContain("[Public article second]");
    expect(second).not.toContain("[Public article first]");
    expect(first.match(/^## Public articles$/gm)).toHaveLength(1);
    expect(second.match(/^## Public articles$/gm)).toHaveLength(1);
  });

  it("leaves canonical HTML requests outside the discovery adapter", async () => {
    expect(await $fetch<string>("/articles/public")).toContain("Canonical public article HTML");
    // Non-discovery requests must not execute the request-sensitive document listing.
    expect(await $fetch<string>("/", { headers: { "x-list-failure": "true" } })).toContain(
      "AI Ready integration fixture HTML"
    );
  });

  it("retains AI Ready's base output when Nitro catches a failed request-hook listing", async () => {
    const response = await fetch("/llms.txt", { headers: { "x-list-failure": "true" } });
    // Nitro captures request-hook errors and continues to AI Ready's route handler.
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("## Existing section");
    expect(body).not.toContain("## Public articles");
    expect(body).not.toContain("PRIVATE_LISTING_SECRET");
  });

  it("serves source Markdown and arbitrary frontmatter instead of the HTML article", async () => {
    const response = await fetch("/articles/public.md");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    const body = await response.text();
    expect(body).toContain("SOURCE_MARKDOWN_BODY");
    expect(body).not.toContain("Canonical public article HTML");
    expect(body.match(/^---$/gm)).toHaveLength(2);
    const metadata = /^---\n([\s\S]*?)\n---\n/.exec(body);
    expect(metadata).not.toBeNull();
    expect(parse(metadata?.[1] ?? "")).toMatchObject({
      title: "Public article",
      description: "Original document description",
      updatedAt: "2026-10-16T09:00:00Z",
      last_updated: "2026-10-16T09:00:00Z",
      canonical_url: "https://example.com/articles/public",
      author: { name: "Alex", role: "Editor" },
      tags: ["Nuxt", "日本語"],
      featured: true,
      readingMinutes: 6,
      expiresAt: null
    });
  });

  it("converts unknown pages and preserves unavailable and failed document responses", async () => {
    expect(await $fetch<string>("/about.md")).toContain("# Fallback HTML content");
    expect(await $fetch<string>("/index.md")).toContain("# Root source");
    expect((await fetch("/articles/draft.md")).status).toBe(404);
    const failure = await fetch("/articles/failure.md");
    expect(failure.status).toBe(500);
    expect(await failure.text()).not.toContain("PRIVATE_FETCH_SECRET");
  });

  it("registers the conversion hook for event-free indexing-style calls in the built Nitro app", async () => {
    const result = await $fetch<{ markdown: string }>("/api/markdown-conversion");
    expect(result.markdown).toContain("SOURCE_MARKDOWN_BODY");
    expect(result.markdown).toContain("author:");
    expect(result.markdown).not.toContain("Converted HTML");
  });
});
