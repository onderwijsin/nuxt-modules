import { beforeEach, describe, expect, it, vi } from "vitest";

const addServerTemplate = vi.fn();
const addTemplate = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { info: vi.fn(), start: vi.fn(), success: vi.fn() };
const loadDirectusConfigSource = vi.fn();
const resolveDirectusConfigFile = vi.fn();
const setResolvedDirectusConfig = vi.fn();

vi.mock("@nuxt/kit", () => ({
  addServerTemplate,
  addTemplate,
  addTypeTemplate,
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
  resolveLoggerScope: () => "directus-config",
  resolveModuleName: () => "@onderwijsin/nuxt-directus-config",
  validateModuleOptions: (options: { enabled?: boolean; configFile?: string | false }) => ({
    enabled: options.enabled ?? true,
    configFile: options.configFile ?? "directus.config.ts"
  })
}));

vi.mock("../src/config/source", () => ({
  generateDirectusRuntimeConfigSource: vi.fn(() => "export default {};\n"),
  generateDirectusServerConfigDeclarationSource: vi.fn(() => "export {};\n"),
  generateDirectusServerConfigSource: vi.fn(() => "export default {};\n"),
  loadDirectusConfigSource,
  resolveDirectusConfigFile
}));

vi.mock("../src/schema", () => ({ setResolvedDirectusConfig }));

function createNuxt() {
  const alias: Record<string, string> = {};
  const paths: Record<string, string[]> = {};
  return {
    options: {
      rootDir: "/project",
      typescript: { tsConfig: { compilerOptions: { paths } }, nodeTsConfig: { include: [] } },
      alias
    }
  };
}

describe("directus-config module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addServerTemplate.mockReset();
    addTemplate.mockReset();
    addTemplate.mockReturnValue({ dst: "/project/.nuxt/directus-config.mjs" });
    addTypeTemplate.mockReset();
    addTypeTemplate.mockReturnValue({ dst: "./types/directus-config-server.d.ts" });
    loadDirectusConfigSource.mockReset();
    loadDirectusConfigSource.mockResolvedValue({
      instance: { baseUrl: "https://cms.example.test" }
    });
    resolveDirectusConfigFile.mockReset();
    resolveDirectusConfigFile.mockReturnValue("/project/directus.config.ts");
    setResolvedDirectusConfig.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("loads shared config and registers both virtual aliases", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    const nuxt = createNuxt();

    await setup({}, nuxt);

    expect(resolveDirectusConfigFile).toHaveBeenCalledWith("/project", "directus.config.ts");
    expect(loadDirectusConfigSource).toHaveBeenCalledWith("/project/directus.config.ts");
    expect(setResolvedDirectusConfig).toHaveBeenCalledWith(nuxt, {
      instance: { baseUrl: "https://cms.example.test" }
    });
    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "directus-config.mjs", write: true })
    );
    expect(addTemplate.mock.calls[0]?.[0].getContents()).toBe("export default {};\n");
    expect(addServerTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "#directus-config-server" })
    );
    expect(nuxt.options.alias["#directus-config"]).toBe("/project/.nuxt/directus-config.mjs");
    expect(
      nuxt.options.typescript.tsConfig.compilerOptions.paths["#directus-config-server"]
    ).toEqual(["./types/directus-config-server.d.ts"]);
    expect(nuxt.options.typescript.nodeTsConfig.include).toEqual(["/project/directus.config.ts"]);
  });

  it("reports a missing configured source and still exposes empty aliases", async () => {
    resolveDirectusConfigFile.mockReturnValue(undefined);
    loadDirectusConfigSource.mockResolvedValue({});
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    const nuxt = createNuxt();

    await setup({}, nuxt);

    expect(logger.info).toHaveBeenCalledWith(
      "No Directus config source found at directus.config.ts."
    );
    expect(loadDirectusConfigSource).toHaveBeenCalledWith(undefined);
    expect(nuxt.options.typescript.nodeTsConfig.include).toEqual([]);
    expect(addTemplate).toHaveBeenCalledTimes(1);
    expect(addServerTemplate).toHaveBeenCalledTimes(1);
  });

  it("does not discover or register runtime aliases when disabled", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");

    await setup({ enabled: false }, createNuxt());

    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(resolveDirectusConfigFile).not.toHaveBeenCalled();
    expect(addTemplate).not.toHaveBeenCalled();
    expect(addServerTemplate).not.toHaveBeenCalled();
    expect(setResolvedDirectusConfig).not.toHaveBeenCalled();
  });
});
