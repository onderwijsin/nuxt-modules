import { beforeEach, describe, expect, it, vi } from "vitest";

const addTemplate = vi.fn();
const addImportsDir = vi.fn();
const addTypeTemplate = vi.fn();
const logger = {
  start: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (definition: unknown) => definition,
  createResolver: () => ({
    resolve: (...segments: string[]) => segments.join("/")
  }),
  useLogger: () => logger,
  addTemplate,
  addImportsDir,
  addTypeTemplate
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  transpileRuntime: (nuxt: any, runtimeDir: string) =>
    nuxt.options.build.transpile.push(runtimeDir),
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "device",
  resolveModuleName: () => "@onderwijsin/nuxt-device"
}));

describe("device module setup contract", () => {
  beforeEach(() => {
    vi.resetModules();
    addTemplate.mockReset();
    addImportsDir.mockReset();
    addTypeTemplate.mockReset();
    logger.start.mockReset();
    logger.success.mockReset();
    logger.info.mockReset();
    logger.warn.mockReset();
    logger.error.mockReset();
  });

  it("configures runtime and template generation", async () => {
    const deviceModule = (await import("../src/module")).default as unknown as {
      setup: (options: unknown, nuxt: any) => void;
    };
    const nuxt: any = {
      options: {
        runtimeConfig: { public: {} },
        build: { transpile: [] as string[] }
      }
    };

    deviceModule.setup({ enabled: true }, nuxt);

    expect(nuxt.options.runtimeConfig.public.device).toEqual({
      enabled: true,
      defaultUserAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36"
    });
    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(addImportsDir).toHaveBeenCalledWith("./runtime/app/composables");
    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "templates/device/crawlers-regex.mjs" })
    );
    expect(addTypeTemplate).toHaveBeenCalledTimes(2);
  });

  it("skips setup when disabled", async () => {
    const deviceModule = (await import("../src/module")).default as unknown as {
      setup: (options: unknown, nuxt: any) => void;
    };
    const nuxt: any = {
      options: {
        runtimeConfig: { public: {} },
        build: { transpile: [] as string[] }
      }
    };

    deviceModule.setup({ enabled: false }, nuxt);

    expect(addTemplate).not.toHaveBeenCalled();
    expect(addImportsDir).not.toHaveBeenCalled();
  });

  it("rejects invalid options", async () => {
    const deviceModule = (await import("../src/module")).default as unknown as {
      setup: (options: unknown, nuxt: any) => void;
    };
    const nuxt: any = {
      options: {
        runtimeConfig: { public: {} },
        build: { transpile: [] as string[] }
      }
    };

    expect(() => deviceModule.setup({ defaultUserAgent: "" }, nuxt)).toThrow(
      "Invalid module options"
    );
  });
});
