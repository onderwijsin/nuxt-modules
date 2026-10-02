import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown renderer global metadata opt-out", async () => {
  await setupFixture(import.meta.url, "basic", {
    nuxtConfig: {
      markdownRenderer: { scopeComponentMeta: false },
      componentMeta: {
        // The consumer chooses its own metadata selection, including an unrelated app component.
        exclude: [/^(?!.*(?:\/renderer\/|\/Unrelated\.vue$)).*/]
      }
    }
  });

  it("retains unrelated metadata selected by the consumer", async () => {
    const names = await $fetch<string[]>("/api/component-registry");
    expect(names).toContain("Unrelated");
    expect(names).toContain("MarkdownButton");
    expect(names).toContain("RendererMarkdownHero");
  });

  it("keeps built-in and consumer renderer metadata", async () => {
    await expect($fetch("/api/markdown-renderer/components/demo")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "MarkdownButton", label: "Button" }),
        expect.objectContaining({ name: "MarkdownHero", label: "Hero" })
      ])
    );
  });
});
