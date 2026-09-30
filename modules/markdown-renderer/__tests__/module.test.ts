import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponentsDir: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  useLogger: vi.fn(() => ({ start: vi.fn(), success: vi.fn(), info: vi.fn() }))
}));

vi.mock("@nuxt/kit", () => kit);

import markdownRendererModule from "../src/module";

describe("markdown renderer module", () => {
  beforeEach(() => {
    kit.addComponentsDir.mockClear();
    kit.createResolver.mockClear();
  });

  it("exposes the expected identity and Nuxt compatibility", () => {
    expect(markdownRendererModule.meta).toMatchObject({
      name: "@onderwijsin/nuxt-markdown-renderer",
      configKey: "markdownRenderer",
      compatibility: { nuxt: "^4.0.0" }
    });
  });

  it("declares Markdown renderer module dependencies", () => {
    expect(markdownRendererModule.moduleDependencies({ options: {} })).toEqual({
      "@comark/nuxt": { version: ">=0.7.0" },
      "@nuxt/ui": { version: ">=4.0.0" }
    });
  });

  it("registers the MarkdownRenderer component directory", () => {
    const nuxt = { options: { build: { transpile: [] } } };
    markdownRendererModule.setup({}, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addComponentsDir).toHaveBeenCalledWith({
      path: "./runtime/app/components",
      pathPrefix: false
    });
  });

  it("skips setup when disabled", () => {
    const nuxt = { options: { build: { transpile: [] } } };
    markdownRendererModule.setup({ enabled: false }, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual([]);
    expect(kit.addComponentsDir).not.toHaveBeenCalled();
  });
});
