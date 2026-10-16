import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("AI Ready discovery with baseURL and rawPrefix", async () => {
  await setupFixture(import.meta.url, "ai-ready", {
    nuxtConfig: {
      app: { baseURL: "/docs/" },
      markdownDocuments: { rawPrefix: "/raw" }
    }
  });

  it("applies both prefixes once while preserving configured sections", async () => {
    const body = await $fetch<string>("/docs/llms.txt?source=integration", {
      headers: { "x-list-marker": "prefixed" }
    });
    expect(body).toContain("## Existing section");
    expect(body).toContain(
      "- [Public article prefixed](/docs/raw/articles/public.md): Nitro runtime metadata"
    );
    expect(body).toContain("- [Home](/docs/raw/index.md)");
    expect(body).not.toContain("/docs/docs/");
    expect(body).not.toContain("SOURCE_MARKDOWN_BODY");
  });

  it("leaves prefixed HTML requests outside the discovery adapter", async () => {
    expect(await $fetch<string>("/docs/", { headers: { "x-list-failure": "true" } })).toContain(
      "AI Ready integration fixture HTML"
    );
  });
});
