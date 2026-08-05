import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addComponentsDir: vi.fn(),
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
  moduleDependencies: Record<string, unknown>;
  setup: (options: Record<string, unknown>, nuxt: never) => void;
};

describe("loops renderer module", () => {
  beforeEach(() => {
    kit.addComponentsDir.mockClear();
    kit.createResolver.mockClear();
  });

  it("declares Nuxt UI as a module dependency", () => {
    expect(moduleDefinition.moduleDependencies).toEqual({
      "@nuxt/ui": { version: ">=4.0.0" }
    });
  });

  it("defaults inline styles on in Nuxt app config", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt as never);

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: { applyInlineStyles: true }
    });
  });

  it("preserves an explicit inline style module setting", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({ applyInlineStyles: false }, nuxt as never);

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: { applyInlineStyles: false }
    });
  });

  it("preserves explicit conditional evaluation fallbacks", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup(
      { evaluate: { onMissingVariable: true, onInvalidCondition: true } },
      nuxt as never
    );

    expect(nuxt.options.appConfig).toMatchObject({
      loopsRenderer: {
        evaluate: { onMissingVariable: true, onInvalidCondition: true }
      }
    });
  });

  it("registers the runtime component directory for enabled modules", () => {
    const nuxt = { options: { appConfig: {}, build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addComponentsDir).toHaveBeenCalledWith({
      path: "./runtime/app/components",
      pathPrefix: false
    });
  });
});
