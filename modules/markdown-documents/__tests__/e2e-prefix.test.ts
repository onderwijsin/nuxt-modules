import { describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

describe("raw prefix and application baseURL", async () => {
  await setupFixture(import.meta.url, "basic", {
    nuxtConfig: {
      app: { baseURL: "/docs/" },
      markdownDocuments: { rawPrefix: "/raw", contentType: "markdown" }
    }
  });

  it("serves only prefixed representations with baseURL applied once", async () => {
    const response = await fetch("/docs/raw/articles/first.md");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(await response.text()).toContain("title: First article");
    expect(await $fetch("/docs/raw/index.md")).toBe("# Root document");
    expect((await fetch("/docs/articles/first.md")).status).toBe(404);
    expect(await $fetch("/docs/neighbor.md")).toBe("Application-owned Markdown");
    expect(await $fetch("/docs/articles/first")).toContain("Article HTML");
  });
  it("keeps the configured Markdown type despite plain-text request headers", async () => {
    const response = await fetch("/docs/raw/articles/first.md", {
      headers: { accept: "text/plain", "content-type": "text/plain" }
    });
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(await response.text()).toContain("title: First article");
  });
});
