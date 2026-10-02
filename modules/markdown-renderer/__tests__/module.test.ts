import type { ComponentMetaParserOptions } from "nuxt-component-meta";
import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  addComponentsDir: vi.fn(),
  addImports: vi.fn(),
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
        defaults: {
          extendMetaFunctions: [
            { name: "extendComponentMeta" },
            { name: "defineEditorComponentSchema", transform: expect.any(Function) }
          ]
        }
      }
    });
  });

  it("registers the generated manifest, components, and static metadata endpoint", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
      hook: vi.fn(),
      hooks: { addHooks: vi.fn() }
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
    expect(kit.addImports).toHaveBeenCalledWith({
      name: "defineEditorComponentSchema",
      from: "./runtime/app/utils/define-editor-component-schema"
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
    for (const route of [
      "/api/markdown-renderer/components",
      "/api/markdown-renderer/components/:componentSet"
    ]) {
      expect(kit.addServerHandler).toHaveBeenCalledWith({
        method: "get",
        route,
        handler: ".nuxt/markdown-renderer/metadata-handler.mjs"
      });
      expect(kit.addServerHandler).toHaveBeenCalledWith({
        method: "options",
        route,
        handler: ".nuxt/markdown-renderer/metadata-handler.mjs"
      });
    }
  });

  it.each([true, false])(
    "scopes metadata only when scopeComponentMeta is %s",
    async (scopeComponentMeta) => {
      const nuxt = {
        options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
        hook: vi.fn(),
        hooks: { addHooks: vi.fn() }
      };
      await setupModule({ scopeComponentMeta, componentsDir: "markdown" }, nuxt);
      const paths = [
        "./runtime/app/components/renderer/MarkdownButton.vue",
        "/project/app/components/markdown/MarkdownHero.vue",
        "/project/app/components/Unrelated.vue",
        "/project/app/components/markdown/nested/Nested.vue",
        "/modules/unrelated/ModuleComponent.vue"
      ];
      const components = paths.map((filePath) => ({
        pascalName: filePath.split("/").at(-1)?.replace(".vue", "") ?? "Component",
        kebabName: "component",
        export: "default",
        filePath,
        shortPath: filePath,
        chunkName: "component",
        prefetch: false,
        preload: false
      }));
      const componentDirs = ["/project/app/components", { path: "/modules/unrelated" }];
      const parserOptions: ComponentMetaParserOptions = {
        components,
        componentDirs,
        overrides: {},
        transformers: [],
        metaFields: { type: true, props: true, slots: true, events: true, exposed: true }
      };
      const hooks = nuxt.hooks.addHooks.mock.calls[0]?.[0];
      hooks["component-meta:extend"](parserOptions);
      if (scopeComponentMeta) {
        expect(parserOptions.components.map(({ filePath }) => filePath)).toEqual(paths.slice(0, 2));
        expect(parserOptions.componentDirs).toEqual(paths.slice(0, 2));
      } else {
        expect(parserOptions.components).toEqual(components);
        expect(parserOptions.componentDirs).toBe(componentDirs);
      }
    }
  );

  it("exposes the configured video base URL to the renderer", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
      hook: vi.fn(),
      hooks: { addHooks: vi.fn() }
    };
    await setupModule({ videoBaseUrl: "https://media.example.com/assets/" }, nuxt);
    expect(nuxt.options.appConfig).toEqual({
      markdownRenderer: { videoBaseUrl: "https://media.example.com/assets/" }
    });
  });

  it("serializes configured metadata CORS origins", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
      hook: vi.fn(),
      hooks: { addHooks: vi.fn() }
    };

    await setupModule({ corsOrigin: "https://directus.example.com" }, nuxt);

    const metadataTemplate = kit.addTemplate.mock.calls[1]?.[0];
    expect(metadataTemplate.getContents()).toContain('["https://directus.example.com"]');
  });

  it("resolves a configured reference resolver through Nuxt Kit", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
      hook: vi.fn(),
      hooks: { addHooks: vi.fn() }
    };

    await setupModule({ resolveReferencePath: "~/utils/reference" }, nuxt);

    expect(kit.resolvePath).toHaveBeenCalledWith("~/utils/reference");
    expect(nuxt.options.alias).toMatchObject({
      "#markdown-renderer/reference-resolver": "/project/app/utils/reference.ts"
    });
  });

  it("keeps declarations available but skips runtime setup when disabled", async () => {
    const nuxt = {
      options: { srcDir: "/project/app", appConfig: {}, alias: {}, build: { transpile: [] } },
      hook: vi.fn()
    };
    await setupModule({ enabled: false }, nuxt);

    expect(kit.addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(kit.addTemplate).not.toHaveBeenCalled();
    expect(kit.addComponent).not.toHaveBeenCalled();
    expect(kit.addImports).not.toHaveBeenCalled();
    expect(kit.addServerHandler).not.toHaveBeenCalled();
  });
});
