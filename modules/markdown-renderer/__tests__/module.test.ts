import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  addComponentsDir: vi.fn(),
  addServerHandler: vi.fn(),
  addTemplate: vi.fn(),
  addTypeTemplate: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  useLogger: vi.fn(() => ({ start: vi.fn(), success: vi.fn(), info: vi.fn() }))
}));

vi.mock("@nuxt/kit", () => kit);

import markdownRendererModule from "../src/module";

function setupModule(options: object, nuxt: object): void {
  Reflect.get(markdownRendererModule, "setup")(options, nuxt);
}

describe("markdown renderer module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kit.addTemplate
      .mockReturnValueOnce({ dst: ".nuxt/markdown-renderer/manifest.mjs" })
      .mockReturnValueOnce({ dst: ".nuxt/markdown-renderer/reference-resolver.ts" })
      .mockReturnValueOnce({ dst: ".nuxt/markdown-renderer/metadata-handler.mjs" });
  });

  it("exposes the expected identity and Nuxt compatibility", () => {
    expect(Reflect.get(markdownRendererModule, "meta")).toMatchObject({
      name: "@onderwijsin/nuxt-markdown-renderer",
      configKey: "markdownRenderer",
      compatibility: { nuxt: "^4.0.0" }
    });
  });

  it("declares renderer dependencies", () => {
    const dependencies = Reflect.get(markdownRendererModule, "moduleDependencies")({ options: {} });
    expect(dependencies).toEqual({
      "@comark/nuxt": { version: ">=0.7.0" },
      "@nuxt/ui": { version: ">=4.0.0" },
      "nuxt-component-meta": {
        version: ">=0.18.0",
        defaults: { exclude: ["Markdown", "MarkdownDocument"] }
      }
    });
  });

  it("registers generated manifests, components, and the metadata endpoint", () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } }
    };
    setupModule({}, nuxt);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(nuxt.options.alias).toEqual({
      "#markdown-renderer/manifest": ".nuxt/markdown-renderer/manifest.mjs",
      "#markdown-renderer/reference-resolver": ".nuxt/markdown-renderer/reference-resolver.ts"
    });
    expect(kit.addComponent).toHaveBeenCalledWith({
      name: "MarkdownRenderer",
      filePath: "./runtime/app/components/MarkdownRenderer.vue"
    });
    expect(kit.addComponentsDir).toHaveBeenCalledWith(
      expect.objectContaining({ path: "./runtime/app/components/renderer", priority: 0 })
    );
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      method: "get",
      route: "/api/markdown-renderer/components/:componentSet?",
      handler: ".nuxt/markdown-renderer/metadata-handler.mjs"
    });
  });

  it("keeps declarations available but skips runtime setup when disabled", () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } }
    };
    setupModule({ enabled: false }, nuxt);

    expect(kit.addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(kit.addTemplate).not.toHaveBeenCalled();
    expect(kit.addComponent).not.toHaveBeenCalled();
    expect(kit.addServerHandler).not.toHaveBeenCalled();
  });
});
