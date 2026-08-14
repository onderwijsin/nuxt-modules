import { beforeEach, describe, expect, it, vi } from "vitest";

const addHook = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn() };
const { buildPrerenderRoutes, getResolvedDirectusConfig } = vi.hoisted(() => ({
  buildPrerenderRoutes: vi.fn(),
  getResolvedDirectusConfig: vi.fn()
}));

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig
}));

vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  withDirectusSetupCache: vi.fn(async (_nuxt, _identity, handler) => handler())
}));

vi.mock("../src/utils/routes", () => ({ buildPrerenderRoutes }));

function createNuxt() {
  return {
    options: {
      directusPrerenderer: {},
      _prepare: false
    },
    hook: addHook
  };
}

describe("directus-prerenderer module", () => {
  beforeEach(() => {
    addHook.mockReset();
    getResolvedDirectusConfig.mockReset();
    getResolvedDirectusConfig.mockReturnValue({
      collections: [
        {
          collection: "pages",
          sitemap: false,
          prerender: {
            fetcher: async () => [{ route: "/pages/home" }],
            fieldmap: { route: "route" }
          }
        }
      ]
    });
    buildPrerenderRoutes.mockResolvedValue(["/pages/home"]);
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("fetches routes during setup and registers the prerender hook", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");

    await setup({}, createNuxt());

    expect(addHook).toHaveBeenCalledWith("prerender:routes", expect.any(Function));
  });

  it("adds only new routes and logs the number added", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");

    await setup({}, createNuxt());

    const prerenderHook = addHook.mock.calls.find(([name]) => name === "prerender:routes")?.[1];
    if (typeof prerenderHook !== "function") throw new TypeError("Prerender hook is unavailable.");

    const routes = new Set(["/already-present"]);
    await prerenderHook({ routes });

    expect([...routes]).toEqual(["/already-present", "/pages/home"]);
    expect(logger.success).toHaveBeenCalledWith("✨ Added 1 Directus prerender route.");
  });

  it("does not fetch or register hooks during Nuxt preparation", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");

    const nuxt = createNuxt();
    nuxt.options._prepare = true;
    await setup({}, nuxt);

    expect(addHook).not.toHaveBeenCalled();
  });
});
