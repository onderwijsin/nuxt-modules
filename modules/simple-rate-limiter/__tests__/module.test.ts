import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerImports = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn() };

vi.mock("defu", () => ({
  defu: (value: unknown, defaults: unknown) => value ?? defaults
}));

vi.mock("@nuxt/kit", () => ({
  addServerImports,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: <T>(definition: T) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", () => ({
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "simple-rate-limiter",
  resolveModuleName: () => "@onderwijsin/nuxt-simple-rate-limiter",
  transpileRuntime: (nuxt: { options: { build: { transpile: string[] } } }, path: string) => {
    nuxt.options.build.transpile.push(path);
  },
  validateModuleOptions: (options: Record<string, unknown>) => options
}));

describe("simple rate limiter module", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerImports.mockReset();
    addTypeTemplate.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("auto-imports both rate limit helpers in Nitro server handlers", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    const nuxt = {
      options: {
        runtimeConfig: { simpleRateLimiter: { consumerValue: "preserved" } },
        build: { transpile: [] as string[] }
      }
    };

    await Reflect.apply(setup, module, [{}, nuxt]);

    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceGlobalRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledTimes(2);
    expect(addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/simple-rate-limiter-config.d.ts",
      src: "./runtime/types/config.d.ts"
    });
    expect(nuxt.options.runtimeConfig.simpleRateLimiter).toMatchObject({
      consumerValue: "preserved"
    });
  });

  it("skips runtime registration when disabled", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    const nuxt = { options: { runtimeConfig: {}, build: { transpile: [] as string[] } } };

    await Reflect.apply(setup, module, [{ enabled: false }, nuxt]);

    expect(addServerImports).not.toHaveBeenCalled();
    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(nuxt.options.build.transpile).toEqual([]);
  });
});
