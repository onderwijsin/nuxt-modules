import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { fetch, setupFixture } from "../../../packages/test-utils/src";

describe("AI Ready prerendered llms-full.txt", async () => {
  await setupFixture(import.meta.url, "ai-ready", {
    dev: false,
    nuxtConfig: {
      nitro: {
        prerender: {
          routes: ["/articles/public", "/about"],
          crawlLinks: false,
          failOnError: true
        }
      }
    }
  });

  it("generates the full export with document source and converted fallback pages", async () => {
    const response = await fetch("/llms-full.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("# AI Ready integration fixture");
    expect(body).toContain("https://example.com/articles/public");
    expect(body.match(/SOURCE_MARKDOWN_BODY/g)).toHaveLength(1);
    expect(body).toContain("# Fallback HTML content");
    expect(body).not.toContain("Canonical public article HTML");
    expect(body).not.toContain("No pages indexed");
    expect(body).not.toContain("/articles/draft");
  });

  it("preserves arbitrary frontmatter in the generated document Markdown twin", async () => {
    const response = await fetch("/articles/public.md");
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("SOURCE_MARKDOWN_BODY");
    expect(body).not.toContain("Canonical public article HTML");
    const metadata = /^---\n([\s\S]*?)\n---\n/.exec(body);
    expect(metadata).not.toBeNull();
    expect(parse(metadata?.[1] ?? "")).toMatchObject({
      title: "Public article",
      author: { name: "Alex", role: "Editor" },
      tags: ["Nuxt", "日本語"],
      featured: true,
      readingMinutes: 6,
      expiresAt: null
    });
  });
});
