import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerImports = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn() };

vi.mock("defu", () => ({
  defu: (value: unknown, defaults: unknown) => value ?? defaults
}));

vi.mock("@nuxt/kit", () => ({
  addServerImports,
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
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("auto-imports both rate limit helpers in Nitro server handlers", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");

    await Reflect.apply(setup, module, [
      {},
      { options: { runtimeConfig: {}, build: { transpile: [] } } }
    ]);

    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledWith({
      name: "enforceGlobalRateLimit",
      from: "./runtime"
    });
    expect(addServerImports).toHaveBeenCalledTimes(2);
  });

  it("skips runtime registration when disabled", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    const nuxt = { options: { runtimeConfig: {}, build: { transpile: [] as string[] } } };

    await Reflect.apply(setup, module, [{ enabled: false }, nuxt]);

    expect(addServerImports).not.toHaveBeenCalled();
    expect(nuxt.options.build.transpile).toEqual([]);
  });
});
