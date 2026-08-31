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

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
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
    string: () => {
      const schema = { default: () => schema, min: () => schema };
      return schema;
    },
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
    const hooks = new Map<string, (value?: unknown) => void>();
    const nuxt: any = {
      hook: vi.fn((name: string, hook: (value?: unknown) => void) => hooks.set(name, hook)),
      options: {
        turnstile: {},
        runtimeConfig: {
          turnstile: { consumerValue: "preserved" },
          public: { turnstile: { consumerValue: "preserved" } }
        },
        build: { transpile: [] }
      }
    };
    mod.setup(
      { enabled: true, siteKey: "site-key", secretKey: "secret-key", adminToken: "admin-key" },
      nuxt
    );
    expect(nuxt.options.turnstile).toEqual({ siteKey: "site-key" });
    expect(nuxt.options.runtimeConfig.turnstile).toEqual({
      consumerValue: "preserved",
      secretKey: "secret-key",
      adminToken: "admin-key",
      adminHeaderName: "x-admin-token"
    });
    expect(nuxt.options.runtimeConfig.public.turnstile).toEqual({
      consumerValue: "preserved",
      siteKey: "site-key"
    });
    expect(addImportsDir).toHaveBeenCalledWith("./runtime/app/composables");
    expect(addServerScanDir).toHaveBeenCalledWith("./runtime/server");
    expect(addTypeTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "types/turnstile-config.d.ts" })
    );

    const nitro = {
      imports: {
        presets: [
          {
            from: "@nuxtjs/turnstile/runtime/server/utils/verify",
            imports: ["verifyTurnstileToken"]
          },
          { from: "@nuxtjs/turnstile/runtime/server/utils/verify", imports: ["otherImport"] },
          { from: "@onderwijsin/nuxt-turnstile/runtime", imports: ["verifyTurnstileToken"] }
        ]
      }
    };
    hooks.get("modules:done")?.();
    hooks.get("nitro:config")?.(nitro);

    expect(nitro.imports.presets).toEqual([
      { from: "@nuxtjs/turnstile/runtime/server/utils/verify", imports: ["otherImport"] },
      { from: "@onderwijsin/nuxt-turnstile/runtime", imports: ["verifyTurnstileToken"] }
    ]);
  });

  it("still registers type declarations when disabled", async () => {
    const mod = (await import("../src/module")).default as any;
    mod.setup(
      { enabled: false },
      { hook: vi.fn(), options: { runtimeConfig: { public: {} }, build: { transpile: [] } } }
    );
    expect(addTypeTemplate).toHaveBeenCalled();
    expect(addImportsDir).not.toHaveBeenCalled();
  });
});
