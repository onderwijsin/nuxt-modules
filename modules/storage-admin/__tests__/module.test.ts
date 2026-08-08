import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerScanDir = vi.fn();
const addTypeTemplate = vi.fn();
const extendPages = vi.fn();
const warn = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addServerScanDir,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  extendPages,
  useLogger: () => ({ start: vi.fn(), success: vi.fn(), info: vi.fn(), warn })
}));

vi.mock("@onderwijsin/nuxt-module-utils/shared", () => ({
  enabled: { default: () => ({}) },
  moduleDependenciesWhenEnabled: (
    options: false | { enabled?: boolean } | undefined,
    dependencies: Record<string, unknown>
  ) => (options === false || options?.enabled === false ? {} : dependencies),
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "storage-admin",
  resolveModuleName: () => "@onderwijsin/nuxt-storage-admin",
  transpileRuntime: (nuxt: { options: { build: { transpile: string[] } } }, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options: Record<string, unknown>) => ({
    enabled: options.enabled !== false,
    adminHeaderName: "x-admin-token",
    devAuthBypass: false,
    mounts: {},
    ui: { enabled: true, path: "/_storage" },
    defaultLimit: 100,
    maxLimit: 500,
    maxListedKeys: 10_000,
    ...options
  })
}));

describe("storage-admin module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerScanDir.mockReset();
    addTypeTemplate.mockReset();
    extendPages.mockReset();
    warn.mockReset();
  });

  it("registers its server runtime and protected route rules", async () => {
    const module = (await import("../src/module")).default as any;
    const nuxt: any = {
      options: { dev: true, runtimeConfig: {}, build: { transpile: [] }, routeRules: {} }
    };

    module.setup(
      { enabled: true, mounts: { cache: { permissions: ["read"], prefixes: ["pages"] } } },
      nuxt
    );

    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(addServerScanDir).toHaveBeenCalledWith("./runtime/server");
    expect(extendPages).toHaveBeenCalledTimes(1);
    expect(nuxt.options.runtimeConfig.storageAdmin).toMatchObject({ enabled: true });
    expect(nuxt.options.routeRules["/api/_storage/**"]).toEqual({
      cache: false,
      prerender: false
    });
  });

  it("generates types but does not register routes when disabled", async () => {
    const module = (await import("../src/module")).default as any;
    module.setup(
      { enabled: false },
      { options: { dev: true, runtimeConfig: {}, build: { transpile: [] }, routeRules: {} } }
    );

    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(addServerScanDir).not.toHaveBeenCalled();
    expect(extendPages).not.toHaveBeenCalled();
  });

  it("does not require Nuxt UI when the development page is disabled", async () => {
    const module = (await import("../src/module")).default as any;

    expect(
      module.moduleDependencies({
        options: { dev: true, storageAdmin: { enabled: true, ui: { enabled: false } } }
      })
    ).toEqual({});
  });

  it("warns when the explicit development authentication bypass is enabled", async () => {
    const module = (await import("../src/module")).default as any;
    const nuxt: any = {
      options: { dev: true, runtimeConfig: {}, build: { transpile: [] }, routeRules: {} }
    };

    module.setup({ enabled: true, devAuthBypass: true }, nuxt);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unauthenticated"));
  });
});
