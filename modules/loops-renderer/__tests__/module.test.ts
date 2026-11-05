import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponentsDir: vi.fn(),
  addImports: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  useLogger: vi.fn(() => ({
    start: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }))
}));

vi.mock("@nuxt/kit", () => kit);

import loopsRendererModule from "../src/module";

const moduleDefinition = loopsRendererModule as unknown as {
  meta: { name: string; configKey: string; compatibility: { nuxt: string } };
  moduleDependencies: (nuxt: {
    options: { loopsRenderer?: { enabled?: boolean } | false };
  }) => Record<string, unknown>;
  setup: (
    options: Record<string, unknown>,
    nuxt: {
      options: { appConfig: Record<string, unknown>; build: { transpile: string[] } };
    }
  ) => void;
};

describe("loops renderer module", () => {
  beforeEach(() => {
    kit.addComponentsDir.mockClear();
    kit.addImports.mockClear();
    kit.createResolver.mockClear();
  });

  it("exposes the expected Nuxt module identity and compatibility", () => {
    expect(moduleDefinition.meta).toMatchObject({
      name: "@onderwijsin/nuxt-loops-renderer",
      configKey: "loopsRenderer",
      compatibility: { nuxt: "^4.0.0" }
    });
  });

  it("declares Nuxt UI as a module dependency", () => {
    expect(moduleDefinition.moduleDependencies({ options: {} })).toEqual({
      "@nuxt/ui": { version: ">=4.0.0" }
    });
    expect(
      moduleDefinition.moduleDependencies({ options: { loopsRenderer: { enabled: false } } })
    ).toEqual({});
  });

  it("defaults inline styles on in Nuxt app config", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt);

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: { applyInlineStyles: true }
    });
  });

  it("preserves an explicit inline style module setting", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({ applyInlineStyles: false }, nuxt);

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: { applyInlineStyles: false }
    });
  });

  it("preserves explicit conditional evaluation fallbacks", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup(
      { evaluate: { onMissingVariable: true, onInvalidCondition: true } },
      nuxt
    );

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: {
        evaluate: { onMissingVariable: true, onInvalidCondition: true }
      }
    });
  });

  it("registers the runtime component directory for enabled modules", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addImports).toHaveBeenCalledWith({
      name: "createLoopsColorMapper",
      from: "./runtime/app/utils/color-mapper"
    });
    expect(kit.addComponentsDir).toHaveBeenCalledWith({
      path: "./runtime/app/components",
      pathPrefix: false
    });
  });

  it("selects the approximation implementation only when opted in", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };
    moduleDefinition.setup({ colorMapping: { approximation: true } }, nuxt);
    expect(kit.addImports).toHaveBeenCalledWith({
      name: "createLoopsColorMapper",
      from: "./runtime/app/utils/color-mapper-approximation"
    });
  });

  it("skips runtime registration when explicitly disabled", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({ enabled: false }, nuxt);

    expect(nuxt.options.appConfig).toEqual({});
    expect(nuxt.options.build.transpile).toEqual([]);
    expect(kit.addComponentsDir).not.toHaveBeenCalled();
    expect(kit.addImports).not.toHaveBeenCalled();
  });
});
