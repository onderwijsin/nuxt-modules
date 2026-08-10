import { beforeEach, describe, expect, it, vi } from "vitest";

const addPlugin = vi.fn();
const addServerHandler = vi.fn();
const addServerPlugin = vi.fn();
const addServerScanDir = vi.fn();
const addTemplate = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() };

vi.mock("@nuxt/kit", () => ({
  addPlugin,
  addServerHandler,
  addServerPlugin,
  addServerScanDir,
  addTemplate,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  transpileRuntime: (nuxt: { options: { build: { transpile: string[] } } }, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options: Record<string, unknown>) => ({
    enabled: true,
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    storageMount: "redirects",
    storeRefreshInterval: 3600,
    excludedNamespaces: ["/api"],
    excludedRoutes: ["/"],
    cache: {
      index: { maxAge: 60, staleMaxAge: 300, swr: true },
      lookup: { maxAge: 60, staleMaxAge: 300, swr: true }
    },
    ...options
  }),
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "redirects",
  resolveModuleName: () => "@onderwijsin/nuxt-redirects"
}));

function createNuxt() {
  return {
    options: {
      rootDir: "/project",
      runtimeConfig: { public: {} },
      build: { transpile: [] as string[] },
      routeRules: {}
    }
  };
}

function setupModule(module: object, options: Record<string, unknown>, nuxt: object): void {
  Reflect.get(module, "setup")(options, nuxt);
}

describe("redirects module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    [
      addPlugin,
      addServerHandler,
      addServerPlugin,
      addServerScanDir,
      addTemplate,
      addTypeTemplate
    ].forEach((mock) => mock.mockReset());
    addTemplate.mockReturnValue({ dst: ".nuxt/redirects-source-registry.mjs" });
  });

  it("registers storage-backed server and client runtime when enabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    setupModule(module, { storageMount: "redisRedirects" }, nuxt);

    expect(Reflect.get(nuxt.options.runtimeConfig, "redirects")).toMatchObject({
      storageMount: "redisRedirects"
    });
    expect(Reflect.get(nuxt.options.runtimeConfig.public, "redirects")).toMatchObject({
      store: true,
      routeMiddleware: true
    });
    expect(addServerScanDir).toHaveBeenCalledTimes(1);
    expect(addServerHandler).toHaveBeenCalledWith(expect.objectContaining({ middleware: true }));
    expect(addPlugin).toHaveBeenCalledTimes(1);
    expect(addServerPlugin).toHaveBeenCalledWith(".nuxt/redirects-source-registry.mjs");
    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "redirects-source-registry.mjs", write: true })
    );
    expect(Reflect.get(nuxt.options.routeRules, "/api/_redirects/**")).toEqual({
      prerender: false
    });
  });

  it("keeps route middleware available without registering a Pinia store", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    setupModule(module, { store: false, routeMiddleware: true, serverMiddleware: false }, nuxt);

    expect(addPlugin).toHaveBeenCalledTimes(1);
    expect(addServerHandler).not.toHaveBeenCalled();
  });

  it("does not register runtime behavior when disabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    setupModule(module, { enabled: false }, nuxt);

    expect(addServerScanDir).not.toHaveBeenCalled();
    expect(addServerHandler).not.toHaveBeenCalled();
    expect(addPlugin).not.toHaveBeenCalled();
    expect(addServerPlugin).not.toHaveBeenCalled();
    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
  });
});
