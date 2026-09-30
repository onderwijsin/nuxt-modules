import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  addComponentsDir: vi.fn(),
  addServerHandler: vi.fn(),
  addTemplate: vi.fn(),
  addTypeTemplate: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  findPath: vi.fn(),
  resolvePath: vi.fn(),
  useLogger: vi.fn(() => ({ start: vi.fn(), success: vi.fn(), info: vi.fn() }))
}));

vi.mock("@nuxt/kit", () => kit);

import markdownRendererModule from "../src/module";

async function setupModule(options: object, nuxt: object): Promise<void> {
  await Reflect.get(markdownRendererModule, "setup")(options, nuxt);
}

describe("markdown renderer module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kit.addTemplate
      .mockReturnValueOnce({ dst: ".nuxt/markdown-renderer/manifest.mjs" })
      .mockReturnValueOnce({ dst: ".nuxt/markdown-renderer/metadata-handler.mjs" });
    kit.findPath.mockResolvedValue(null);
    kit.resolvePath.mockResolvedValue("/project/app/utils/reference.ts");
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

  it("registers the generated manifest, components, and static metadata endpoint", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } },
      hook: vi.fn()
    };
    await setupModule({}, nuxt);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(nuxt.options.alias).toEqual({
      "#markdown-renderer/manifest": ".nuxt/markdown-renderer/manifest.mjs",
      "#markdown-renderer/manifest-factory": "./runtime/app/utils/component-manifest",
      "#markdown-renderer/reference-resolver": "./runtime/app/utils/resolve-reference-path"
    });
    expect(kit.addComponent).toHaveBeenCalledWith({
      name: "MarkdownRenderer",
      filePath: "./runtime/app/components/MarkdownRenderer.vue"
    });
    expect(kit.addComponentsDir).toHaveBeenCalledWith(
      expect.objectContaining({ path: "./runtime/app/components/renderer", priority: 0 })
    );
    const componentHook = nuxt.hook.mock.calls.find(([name]) => name === "components:extend")?.[1];
    componentHook([
      {
        pascalName: "MarkdownCallout",
        filePath: "./runtime/app/components/renderer/MarkdownCallout.vue"
      }
    ]);
    const manifestTemplate = kit.addTemplate.mock.calls[0]?.[0];
    expect(manifestTemplate.getContents()).toContain(
      '"MarkdownCallout": () => import("./runtime/app/components/renderer/MarkdownCallout.vue")'
    );
    const metadataTemplate = kit.addTemplate.mock.calls[1]?.[0];
    expect(metadataTemplate.getContents()).toContain(
      '[{"name":"MarkdownCallout","componentName":"MarkdownCallout"}]'
    );
    expect(metadataTemplate.getContents()).toContain('  {},\n  "*"');
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      method: "get",
      route: "/api/markdown-renderer/components/:componentSet?",
      handler: ".nuxt/markdown-renderer/metadata-handler.mjs"
    });
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      method: "options",
      route: "/api/markdown-renderer/components/:componentSet?",
      handler: ".nuxt/markdown-renderer/metadata-handler.mjs"
    });
  });

  it("serializes configured metadata CORS origins", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } },
      hook: vi.fn()
    };

    await setupModule({ corsOrigin: "https://directus.example.com" }, nuxt);

    const metadataTemplate = kit.addTemplate.mock.calls[1]?.[0];
    expect(metadataTemplate.getContents()).toContain('["https://directus.example.com"]');
  });

  it("resolves a configured reference resolver through Nuxt Kit", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } },
      hook: vi.fn()
    };

    await setupModule({ resolveReferencePath: "~/utils/reference" }, nuxt);

    expect(kit.resolvePath).toHaveBeenCalledWith("~/utils/reference");
    expect(nuxt.options.alias).toMatchObject({
      "#markdown-renderer/reference-resolver": "/project/app/utils/reference.ts"
    });
  });

  it("keeps declarations available but skips runtime setup when disabled", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", alias: {}, build: { transpile: [] } },
      hook: vi.fn()
    };
    await setupModule({ enabled: false }, nuxt);

    expect(kit.addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(kit.addTemplate).not.toHaveBeenCalled();
    expect(kit.addComponent).not.toHaveBeenCalled();
    expect(kit.addServerHandler).not.toHaveBeenCalled();
  });
});
