import { beforeEach, describe, expect, it, vi } from "vitest";

const addImportsDir = vi.fn();
const addServerScanDir = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

vi.mock("@nuxt/kit", () => ({
  addImportsDir,
  addServerScanDir,
  addTypeTemplate,
  useLogger: () => logger,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition
}));

vi.mock("module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("module-utils/shared")>()),
  transpileRuntime: (nuxt: any, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  validateModuleOptions: (options: Record<string, unknown>) => ({
    enabled: true,
    siteKey: "",
    secretKey: "",
    adminToken: "",
    adminHeaderName: "x-admin-token",
    ...options
  }),
  moduleSetup: (_name: string, options: { enabled?: boolean }, log: typeof logger) => ({
    start: () => log.start(),
    end: () => log.success(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "turnstile",
  resolveModuleName: () => "@onderwijsin/nuxt-turnstile"
}));

vi.mock("defu", () => ({
  defu: (base: Record<string, unknown> | undefined, defaults: Record<string, unknown>) => ({
    ...defaults,
    ...base
  })
}));

vi.mock("zod", () => ({
  z: {
    boolean: () => ({ default: () => ({}) }),
    string: () => ({ min: () => ({}) }),
    object: () => ({
      safeParse: (value: unknown) => ({ success: true, data: value })
    })
  }
}));

describe("turnstile module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of [addImportsDir, addServerScanDir, addTypeTemplate, ...Object.values(logger)])
      mock.mockReset();
  });

  it("registers dependencies, config, runtime imports, and types", async () => {
    const mod = (await import("../src/module")).default as any;
    const nuxt: any = {
      options: { turnstile: {}, runtimeConfig: { public: {} }, build: { transpile: [] } }
    };
    mod.setup(
      { enabled: true, siteKey: "site-key", secretKey: "secret-key", adminToken: "admin-key" },
      nuxt
    );
    expect(nuxt.options.turnstile).toEqual({ siteKey: "site-key" });
    expect(nuxt.options.runtimeConfig.turnstile).toEqual({
      secretKey: "secret-key",
      adminToken: "admin-key",
      adminHeaderName: "x-admin-token"
    });
    expect(nuxt.options.runtimeConfig.public.turnstile).toEqual({ siteKey: "site-key" });
    expect(addImportsDir).toHaveBeenCalledWith("./runtime/app/composables");
    expect(addServerScanDir).toHaveBeenCalledWith("./runtime/server");
    expect(addTypeTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "types/turnstile-config.d.ts" })
    );
  });

  it("still registers type declarations when disabled", async () => {
    const mod = (await import("../src/module")).default as any;
    mod.setup(
      { enabled: false },
      { options: { runtimeConfig: { public: {} }, build: { transpile: [] } } }
    );
    expect(addTypeTemplate).toHaveBeenCalled();
    expect(addImportsDir).not.toHaveBeenCalled();
  });
});
