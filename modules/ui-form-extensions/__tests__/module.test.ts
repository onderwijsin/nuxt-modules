import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addImportsDir: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  useLogger: vi.fn(() => ({
    start: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }))
}));

vi.mock("@nuxt/kit", () => kit);

import formExtensionsModule from "../src/module";

const moduleDefinition = formExtensionsModule as unknown as {
  moduleDependencies: (nuxt: {
    options: { uiFormExtensions?: { enabled?: boolean } | false };
  }) => Record<string, unknown>;
  setup: (options: Record<string, unknown>, nuxt: never) => void;
};

describe("ui form extensions module", () => {
  beforeEach(() => {
    kit.addImportsDir.mockClear();
    kit.createResolver.mockClear();
  });

  it("declares Nuxt UI as a module dependency", () => {
    expect(moduleDefinition.moduleDependencies({ options: {} })).toEqual({
      "@nuxt/ui": { version: ">=4.0.0" }
    });
    expect(
      moduleDefinition.moduleDependencies({ options: { uiFormExtensions: { enabled: false } } })
    ).toEqual({});
  });

  it("registers the composables directory for enabled modules", () => {
    const nuxt = { options: { build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addImportsDir).toHaveBeenCalledWith("./runtime/app/composables");
  });
});
