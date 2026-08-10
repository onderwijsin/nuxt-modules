import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerScanDir = vi.fn();
const addTypeTemplate = vi.fn();
const warn = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addServerScanDir,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments) => segments.join("/") }),
  defineNuxtModule: (definition) => definition,
  useLogger: () => ({ start: vi.fn(), success: vi.fn(), info: vi.fn(), warn })
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", () => ({
  enabled: { default: () => ({}) },
  moduleSetup: (_name, options) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "cache",
  resolveModuleName: () => "@onderwijsin/nuxt-cache",
  transpileRuntime: (nuxt, runtimeDir) => nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options) => ({
    enabled: options.enabled !== false,
    adminHeaderName: "x-admin-token",
    devAuthBypass: false,
    maxInvalidatedEntries: 1_000,
    ...options
  })
}));

describe("cache module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerScanDir.mockReset();
    addTypeTemplate.mockReset();
    warn.mockReset();
  });

  it("registers runtime handlers, types, and async request context", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      options: {
        dev: true,
        runtimeConfig: { cache: { applicationField: true }, nuxtCache: { preservedField: true } },
        build: { transpile: [] },
        routeRules: {}
      }
    };

    module.setup({ enabled: true }, nuxt);

    expect(addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/cache-config.d.ts",
      src: "./runtime/types/config.d.ts"
    });
    expect(addServerScanDir).toHaveBeenCalledWith("./runtime/server");
    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(nuxt.options.nitro).toMatchObject({ experimental: { asyncContext: true } });
    expect(nuxt.options.runtimeConfig.cache).toEqual({ applicationField: true });
    expect(nuxt.options.runtimeConfig.nuxtCache).toMatchObject({
      enabled: true,
      preservedField: true
    });
    expect(nuxt.options.routeRules["/api/_cache/**"]).toEqual({ cache: false, prerender: false });
  });

  it("only generates type declarations when disabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      options: { dev: true, runtimeConfig: {}, build: { transpile: [] }, routeRules: {} }
    };

    module.setup({ enabled: false }, nuxt);

    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(addServerScanDir).not.toHaveBeenCalled();
    expect(nuxt.options.nitro).toBeUndefined();
  });

  it("warns when the explicit development authentication bypass is enabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      options: { dev: true, runtimeConfig: {}, build: { transpile: [] }, routeRules: {} }
    };

    module.setup({ enabled: true, devAuthBypass: true }, nuxt);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unauthenticated"));
  });
});
