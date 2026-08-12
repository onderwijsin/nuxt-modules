import { beforeEach, describe, expect, it, vi } from "vitest";

const addPrerenderRoutes = vi.fn();
const addServerHandler = vi.fn();
const addServerTemplate = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() };
const { getResolvedDirectusConfig } = vi.hoisted(() => ({ getResolvedDirectusConfig: vi.fn() }));

vi.mock("@nuxt/kit", () => ({
  addPrerenderRoutes,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig
}));

function createNuxt() {
  return {
    options: {
      runtimeConfig: { public: {} },
      sitemap: { sources: ["/existing-source"] },
      typescript: { tsConfig: {} },
      routeRules: {},
      build: { transpile: ["/existing-runtime"] }
    }
  };
}

async function setupModule(options: Record<string, unknown>, nuxt = createNuxt()) {
  const module = (await import("../src/module")).default;
  const setup = Reflect.get(module, "setup");
  if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
  setup(options, nuxt);
  return { module, nuxt };
}

describe("directus-sitemaps module", () => {
  beforeEach(() => {
    vi.resetModules();
    getResolvedDirectusConfig.mockReset();
    getResolvedDirectusConfig.mockReturnValue(undefined);
    [addPrerenderRoutes, addServerHandler, addServerTemplate, addTypeTemplate].forEach((mock) =>
      mock.mockReset()
    );
    addTypeTemplate.mockReturnValue({ dst: "/generated/directus-sitemaps-config.d.ts" });
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("registers one source, endpoint caching, and sitemap prerender routes", async () => {
    const { nuxt } = await setupModule({
      sitemaps: {
        static: [{ loc: "/about" }],
        cache: { maxAge: 60, staleMaxAge: 30, swr: true },
        prerenderSitemaps: true
      }
    });

    expect(addServerHandler).toHaveBeenCalledTimes(2);
    expect(nuxt.options.sitemap.sources).toEqual([
      "/api/_directus-sitemaps/urls",
      "/existing-source"
    ]);
    expect(Object.values(nuxt.options.routeRules)).toContainEqual({
      cache: { maxAge: 60, staleMaxAge: 30, swr: true },
      prerender: true
    });
    expect(addPrerenderRoutes).toHaveBeenCalledWith([
      "/api/_directus-sitemaps/urls",
      "/sitemap.xml"
    ]);
  });

  it("merges shared settings while direct serializable settings take precedence", async () => {
    getResolvedDirectusConfig.mockReturnValue({
      collections: { collections: [] },
      sitemaps: {
        static: [{ loc: "/shared" }],
        apiEndpoint: "/api/shared-sitemap-source",
        enablePrettyUrls: false,
        cache: false,
        prerenderSitemaps: false
      }
    });

    const { nuxt } = await setupModule({
      sitemaps: { static: [{ loc: "/direct" }], cache: { maxAge: 10 } }
    });

    expect(nuxt.options.sitemap.sources).toEqual([
      "/api/shared-sitemap-source",
      "/existing-source"
    ]);
    expect(addServerHandler).toHaveBeenCalledTimes(1);
    expect(Object.values(nuxt.options.routeRules)).toContainEqual({
      cache: { maxAge: 10, staleMaxAge: 0, swr: true },
      prerender: false
    });
    const template = addServerTemplate.mock.calls[0]?.[0];
    expect(template?.getContents()).toContain(
      'import directusConfig from "#directus-config-server";'
    );
    expect(template?.getContents()).toContain('[{"loc":"/direct"},{"loc":"/shared"}]');
  });

  it("registers the source on named sitemap configurations", async () => {
    const { nuxt } = await setupModule({
      collections: {
        collections: [
          {
            collection: "articles",
            sitemap: { _sitemap: "articles", mapper: () => ({ path: "/articles" }) },
            prerender: false
          }
        ]
      },
      sitemaps: { prerenderSitemaps: true }
    });

    expect(nuxt.options.sitemap.sources).toEqual(["/existing-source"]);
    expect(Reflect.get(nuxt.options.sitemap, "sitemaps")).toEqual({
      articles: { sources: ["/api/_directus-sitemaps/urls"] }
    });
    expect(addPrerenderRoutes).toHaveBeenCalledWith([
      "/api/_directus-sitemaps/urls",
      "/sitemap_index.xml",
      "/__sitemap__/articles.xml"
    ]);
  });

  it("registers a source when the sitemap module has no existing sources", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    const nuxt = {
      options: {
        runtimeConfig: { public: {} },
        sitemap: {},
        typescript: { tsConfig: {} },
        routeRules: {},
        build: { transpile: ["/existing-runtime"] }
      }
    };

    setup({}, nuxt);

    expect(Reflect.get(nuxt.options.sitemap, "sources")).toEqual(["/api/_directus-sitemaps/urls"]);
  });

  it("keeps its endpoint available when @nuxtjs/sitemap is disabled", async () => {
    const module = (await import("../src/module")).default;
    const setup = Reflect.get(module, "setup");
    if (typeof setup !== "function") throw new TypeError("Module setup is unavailable.");
    setup(
      {},
      {
        options: {
          runtimeConfig: { public: {} },
          sitemap: false,
          typescript: { tsConfig: {} },
          routeRules: {},
          build: { transpile: ["/existing-runtime"] }
        }
      }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      "@nuxtjs/sitemap is disabled; no Directus sitemap source was registered."
    );
    expect(addServerHandler).toHaveBeenCalledTimes(2);
  });

  it("generates types but registers no runtime behavior when disabled", async () => {
    const { nuxt } = await setupModule({ enabled: false });

    expect(addTypeTemplate).toHaveBeenCalledOnce();
    expect(addServerTemplate).not.toHaveBeenCalled();
    expect(addServerHandler).not.toHaveBeenCalled();
    expect(addPrerenderRoutes).not.toHaveBeenCalled();
    expect(nuxt.options.build.transpile).toEqual(["/existing-runtime"]);
  });

  it("rejects invalid source endpoint configuration before registration", async () => {
    await expect(setupModule({ sitemaps: { apiEndpoint: "sitemap-source" } })).rejects.toThrow(
      "Invalid module options"
    );
    expect(addServerHandler).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("declares its dependencies only when enabled", async () => {
    const module = (await import("../src/module")).default;
    const moduleDependencies = Reflect.get(module, "moduleDependencies");
    if (typeof moduleDependencies !== "function") {
      throw new TypeError("Module dependencies are unavailable.");
    }

    expect(moduleDependencies({ options: { directusSitemaps: { enabled: true } } })).toEqual({
      "@onderwijsin/nuxt-directus": { version: ">=0.2.0" },
      "@nuxtjs/sitemap": { version: ">=8.0.0" }
    });
    expect(moduleDependencies({ options: { directusSitemaps: { enabled: false } } })).toEqual({});
  });
});
