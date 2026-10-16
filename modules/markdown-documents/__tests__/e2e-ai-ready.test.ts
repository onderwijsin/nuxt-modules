import { describe, expect, it } from "vitest";
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
});
