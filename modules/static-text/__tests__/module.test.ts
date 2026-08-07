import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addTemplate: vi.fn((template: { filename: string }) => ({ dst: `./${template.filename}` })),
  addTypeTemplate: vi.fn(),
  useLogger: vi.fn(() => ({ start: vi.fn(), success: vi.fn(), info: vi.fn() })),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition)
}));

vi.mock("@nuxt/kit", () => kit);
vi.mock("module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("module-utils/shared")>()),
  transpileRuntime: (nuxt: any, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options: Record<string, any>) => {
    if (
      typeof options.content === "string" &&
      (options.content.startsWith("/") ||
        options.content.startsWith("../") ||
        options.content.includes("\\") ||
        options.content.includes("["))
    ) {
      throw new Error("Invalid module options");
    }
    return { enabled: true, ...options };
  },
  moduleSetup: vi.fn((_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  })),
  resolveLoggerScope: vi.fn(() => "static-text"),
  resolveModuleName: vi.fn(() => "@onderwijsin/nuxt-static-text")
}));

import textModule from "../src/module";

const moduleDefinition = textModule as unknown as {
  meta: { name: string; configKey: string; compatibility: { nuxt: string } };
  setup: (options: { enabled?: boolean; content?: string }, nuxt: never) => void;
};

describe("text module", () => {
  beforeEach(() => {
    kit.addImports.mockClear();
    kit.addPlugin.mockClear();
    kit.addTemplate.mockClear();
    kit.addTypeTemplate.mockClear();
  });

  it("exposes the expected package identity", () => {
    expect(moduleDefinition.meta).toMatchObject({
      name: "@onderwijsin/nuxt-static-text",
      configKey: "staticText",
      compatibility: { nuxt: "^4.0.0" }
    });
  });

  it("registers generated content, runtime assets, and type augmentation", () => {
    const nuxt = { options: { srcDir: "/project/app", build: { transpile: [] } } };

    moduleDefinition.setup({ content: "assets/ui/content" }, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "static-text-content.ts", write: true })
    );
    expect(kit.addImports).toHaveBeenCalledWith({
      name: "useText",
      from: "./runtime/app/composables/text"
    });
    expect(kit.addPlugin).toHaveBeenCalledWith("./runtime/app/plugins/text");
    expect(kit.addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/static-text.d.ts",
      src: "./runtime/types/static-text.d.ts"
    });
  });

  it("removes a leading ./ before resolving the content path", () => {
    const nuxt = { options: { srcDir: "/project/app", build: { transpile: [] } } };

    moduleDefinition.setup({ content: "./assets/ui/content" }, nuxt as never);

    const template = kit.addTemplate.mock.calls[0]?.[0] as unknown as {
      getContents: () => string;
    };

    expect(template.getContents()).toContain("/project/app/assets/ui/content");
    expect(template.getContents()).not.toContain("/project/app/./assets/ui/content");
  });

  it("uses the default content path when content is omitted", () => {
    const nuxt = { options: { srcDir: "/project/app", build: { transpile: [] } } };

    moduleDefinition.setup({}, nuxt as never);

    const template = kit.addTemplate.mock.calls[0]?.[0] as unknown as {
      getContents: () => string;
    };

    expect(template.getContents()).toContain("/project/app/assets/ui/content");
  });

  it.each(["/absolute/content", "../outside/content", "assets\\\\content", "invalid [path]"])(
    "rejects invalid content path %s",
    (content) => {
      const nuxt = { options: { srcDir: "/project/app", build: { transpile: [] } } };

      expect(() => moduleDefinition.setup({ content }, nuxt as never)).toThrow(
        "Invalid module options"
      );
    }
  );

  it("skips runtime registration when disabled", () => {
    const nuxt = { options: { srcDir: "/project/app", build: { transpile: [] } } };

    moduleDefinition.setup({ enabled: false }, nuxt as never);

    expect(kit.addTemplate).not.toHaveBeenCalled();
    expect(kit.addImports).not.toHaveBeenCalled();
    expect(kit.addPlugin).not.toHaveBeenCalled();
    expect(kit.addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/static-text.d.ts",
      src: "./runtime/types/static-text.d.ts"
    });
  });
});
