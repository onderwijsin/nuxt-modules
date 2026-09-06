import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerHandler = vi.fn();
const addServerPlugin = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

vi.mock("@nuxt/kit", () => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler,
  addServerImports: vi.fn(),
  addServerPlugin,
  addTypeTemplate: vi.fn(),
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: <T>(definition: T) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
    start: vi.fn(),
    end: vi.fn(),
    isEnabled: () => options.enabled !== false
  }),
  resolveLoggerScope: () => "directus-client",
  resolveModuleName: () => "@onderwijsin/nuxt-directus-client",
  transpileRuntime: vi.fn(),
  validateModuleOptions: (
    options: Record<string, unknown>,
    schema: { parse: (value: unknown) => unknown }
  ) => schema.parse(options)
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig: () => undefined
}));

vi.mock("@onderwijsin/nuxt-directus-config/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/config")>()),
  getResolvedDirectusConfigFromSource: vi.fn()
}));

function createNuxt() {
  return {
    options: {
      _prepare: true,
      buildDir: "/project/.nuxt",
      dev: false,
      modules: [],
      rootDir: "/project",
      runtimeConfig: { public: {} },
      typescript: { nodeTsConfig: {} }
    }
  };
}

describe("Directus asset module registration", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerHandler.mockReset();
    addServerPlugin.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it.each([
    {
      cacheEnabled: false,
      handler: "assets/uncached-handler",
      pluginEnabled: false,
      name: "uncached"
    },
    { cacheEnabled: true, handler: "assets/cached-handler", pluginEnabled: true, name: "cached" }
  ])(
    "registers the $name asset handler and matching cache plugin",
    async ({ cacheEnabled, handler, pluginEnabled }) => {
      const module = (await import("../src/module")).default;
      const nuxt = createNuxt();

      await Reflect.get(module, "setup")(
        {
          instance: { baseUrl: "https://cms.example.test" },
          client: {
            assets: {
              cache: {
                enabled: cacheEnabled,
                ...(cacheEnabled ? { storage: "directus-assets", maxAge: 60 } : {})
              }
            }
          }
        },
        nuxt
      );

      expect(addServerHandler).toHaveBeenCalledWith({
        route: "/_directus/assets/**",
        handler: `./runtime/${handler}`
      });
      expect(addServerPlugin).toHaveBeenCalledTimes(pluginEnabled ? 1 : 0);
      if (pluginEnabled)
        expect(addServerPlugin).toHaveBeenCalledWith("./runtime/assets/nitro-plugin");
    }
  );
});
