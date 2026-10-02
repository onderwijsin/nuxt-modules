import { describe, expect, it, vi } from "vitest";

import { createRendererManifest } from "../src/runtime/app/utils/component-manifest";

describe("renderer component manifest", () => {
  it("resolves component names case-insensitively through lazy loaders", async () => {
    const loadHero = vi.fn(async () => ({ default: "hero" }));
    const manifest = createRendererManifest({ MarkdownHero: loadHero }, {});

    await expect(manifest.resolveRendererComponent("markdownHero")).resolves.toEqual({
      default: "hero"
    });
    expect(loadHero).toHaveBeenCalledOnce();
  });

  it("resolves Comark kebab-case component names", async () => {
    const loadButton = vi.fn(async () => ({ default: "button" }));
    const manifest = createRendererManifest({ MarkdownButton: loadButton }, {});

    await expect(manifest.resolveRendererComponent("markdown-button")).resolves.toEqual({
      default: "button"
    });
    expect(loadButton).toHaveBeenCalledOnce();
  });

  it("only resolves components belonging to the selected set", () => {
    const manifest = createRendererManifest(
      {
        MarkdownHero: vi.fn(async () => ({ default: "hero" })),
        MarkdownButton: vi.fn(async () => ({ default: "button" }))
      },
      { landing: ["MarkdownHero"] }
    );

    expect(manifest.resolveRendererComponent("MarkdownButton", "landing")).toBeNull();
    expect(manifest.resolveRendererComponent("MarkdownHero", "missing")).toBeNull();
  });
});
