import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerHandler = vi.fn();
const addTemplate = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() };

vi.mock("@nuxt/kit", () => ({
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>()),
  transpileRuntime: (nuxt: any, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options: Record<string, any>) => {
    if (options.directus?.baseUrl === "not-a-url") throw new Error("Invalid module options");
    return {
      enabled: true,
      timeoutMs: 5000,
      cache: { enabled: true },
      cloudinary: { enabled: false },
      directus: { enabled: false },
      ...options
    };
  },
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "healthcheck",
  resolveModuleName: () => "@onderwijsin/nuxt-healthcheck"
}));

describe("healthcheck module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerHandler.mockReset();
    addTemplate.mockReset();
    addTemplate.mockReturnValue({ dst: ".nuxt/healthcheck-handler.mjs" });
    addTypeTemplate.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("registers endpoints, runtime config, generated components, and type templates", async () => {
    const module = (await import("../src/module")).default as any;
    const nuxt: any = {
      options: {
        srcDir: "/project",
        runtimeConfig: {},
        build: { transpile: [] },
        routeRules: {}
      }
    };

    module.setup(
      { enabled: true, directus: { enabled: true, baseUrl: "https://directus.example.com" } },
      nuxt
    );

    expect(nuxt.options.runtimeConfig.healthcheck).toEqual({
      enabled: true,
      timeoutMs: 5000,
      cache: { enabled: true },
      cloudinary: { enabled: false },
      directus: { enabled: true, baseUrl: "https://directus.example.com" }
    });
    expect(addServerHandler).toHaveBeenCalledTimes(2);
    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "healthcheck-handler.mjs", write: true })
    );
    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(nuxt.options.routeRules["/api/system/**"]).toEqual({ cache: false, prerender: false });
  });

  it("rejects invalid module options with a useful error", async () => {
    const module = (await import("../src/module")).default as any;
    expect(() =>
      module.setup(
        { directus: { enabled: true, baseUrl: "not-a-url" } },
        {
          options: {
            srcDir: "/project",
            runtimeConfig: {},
            build: { transpile: [] },
            routeRules: {}
          }
        }
      )
    ).toThrow(/Invalid module options/);
  });

  it("skips runtime registration when disabled after validating options", async () => {
    const module = (await import("../src/module")).default as any;
    const nuxt = {
      options: { srcDir: "/project", runtimeConfig: {}, build: { transpile: [] }, routeRules: {} }
    };
    module.setup({ enabled: false }, nuxt);
    expect(addServerHandler).not.toHaveBeenCalled();
    expect(addTemplate).not.toHaveBeenCalled();
    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
  });
});
