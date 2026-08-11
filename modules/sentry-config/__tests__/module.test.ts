import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const addServerPlugin = vi.fn();
const addServerTemplate = vi.fn((template: { filename: string }) => template);
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() };

interface TestRuntimeConfig {
  public: { sentry?: { dsn?: string; runtime: string } };
}

function createRuntimeConfig(): TestRuntimeConfig {
  return { public: {} };
}

vi.mock("@nuxt/kit", () => ({
  addServerPlugin,
  addServerTemplate,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "sentry-config",
  resolveModuleName: () => "@onderwijsin/nuxt-sentry-config",
  validateModuleOptions: (options: Record<string, unknown>) => ({
    enabled: true,
    autoInjectServerConfig: true,
    disableNitroSourceMapUpload: true,
    ...options
  })
}));

describe("sentry-config module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerPlugin.mockReset();
    addServerTemplate.mockClear();
    addTypeTemplate.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers the Cloudflare Nitro plugin", async () => {
    const module = (await import("../src/module")).default;
    const nitroOptions: Record<string, unknown> = { preset: "cloudflare_module" };
    const runtimeConfig = createRuntimeConfig();
    const nuxt = {
      hook: vi.fn(),
      options: {
        rootDir: "/project",
        nitro: nitroOptions,
        runtimeConfig
      }
    };

    await Reflect.get(module, "setup")({}, nuxt);

    expect(addServerTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "#sentry-config/cloudflare-config.mjs" })
    );
    expect(addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/sentry-config.d.ts",
      src: "./runtime/types/config.d.ts"
    });
    expect(addServerPlugin).toHaveBeenCalledWith("./runtime/server/plugins/cloudflare");
    expect(nitroOptions.cloudflare).toEqual({ nodeCompat: true });
    expect(runtimeConfig.public.sentry).toEqual({
      dsn: undefined,
      runtime: "cloudflare_module"
    });
  });

  it("uses NITRO_PRESET when Nuxt has not yet resolved the preset in development", async () => {
    vi.stubEnv("NITRO_PRESET", "cloudflare_module");
    const module = (await import("../src/module")).default;
    const runtimeConfig = createRuntimeConfig();
    const nuxt = {
      hook: vi.fn(),
      options: {
        rootDir: "/project",
        nitro: {},
        runtimeConfig
      }
    };

    await Reflect.get(module, "setup")({}, nuxt);

    expect(addServerPlugin).toHaveBeenCalledWith("./runtime/server/plugins/cloudflare");
    expect(runtimeConfig.public.sentry).toEqual({
      dsn: undefined,
      runtime: "cloudflare_module"
    });
  });

  it("registers Node Nitro initialization by default", async () => {
    const module = (await import("../src/module")).default;
    const hooks = new Map<string, (...arguments_: unknown[]) => void>();
    const runtimeConfig = createRuntimeConfig();
    const nuxt = {
      hook: (name: string, callback: (...arguments_: unknown[]) => void) =>
        hooks.set(name, callback),
      options: {
        rootDir: "/project",
        nitro: {},
        runtimeConfig
      }
    };

    await Reflect.get(module, "setup")(
      { autoInjectServerConfig: false, dsn: "https://public@example.ingest.sentry.io/1" },
      nuxt
    );

    expect(hooks.has("nitro:init")).toBe(true);
    expect(addServerPlugin).not.toHaveBeenCalled();
    expect(runtimeConfig.public.sentry).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      runtime: "node-server"
    });
  });

  it("does not register runtime wiring when disabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = {
      hook: vi.fn(),
      options: { rootDir: "/project", nitro: {}, runtimeConfig: { public: {} } }
    };

    await Reflect.get(module, "setup")({ enabled: false }, nuxt);

    expect(nuxt.hook).not.toHaveBeenCalled();
    expect(addServerPlugin).not.toHaveBeenCalled();
  });
});
