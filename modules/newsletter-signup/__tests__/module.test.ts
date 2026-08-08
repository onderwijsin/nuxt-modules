import { beforeEach, describe, expect, it, vi } from "vitest";

const addImports = vi.fn();
const addServerScanDir = vi.fn();
const addTypeTemplate = vi.fn();
const logger = { start: vi.fn(), success: vi.fn(), info: vi.fn() };

vi.mock("@nuxt/kit", () => ({
  addImports,
  addServerScanDir,
  addTypeTemplate,
  createResolver: () => ({ resolve: (...segments: string[]) => segments.join("/") }),
  defineNuxtModule: <T>(definition: T) => definition,
  useLogger: () => logger
}));

vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>();

  return {
    ...original,
    moduleSetup: (_name: string, options: { enabled?: boolean }) => ({
      start: vi.fn(),
      end: vi.fn(),
      isEnabled: () => options.enabled !== false
    }),
    resolveLoggerScope: () => "newsletter-signup",
    resolveModuleName: () => "@onderwijsin/nuxt-newsletter-signup",
    transpileRuntime: (nuxt: { options: { build: { transpile: string[] } } }, path: string) => {
      nuxt.options.build.transpile.push(path);
    },
    validateModuleOptions: (
      options: Record<string, unknown>,
      schema: Parameters<typeof original.validateModuleOptions>[1],
      log: Parameters<typeof original.validateModuleOptions>[2]
    ) =>
      original.validateModuleOptions(
        {
          enabled: true,
          endpoint: { enabled: true, url: "/api/newsletter/signup" },
          ...options
        },
        schema,
        log
      )
  };
});

function createNuxt() {
  return {
    options: {
      runtimeConfig: { public: {} },
      build: { transpile: [] as string[] }
    }
  };
}

describe("newsletter signup module setup", () => {
  beforeEach(() => {
    vi.resetModules();
    addImports.mockReset();
    addServerScanDir.mockReset();
    addTypeTemplate.mockReset();
    Object.values(logger).forEach((mock) => mock.mockReset());
  });

  it("registers the local runtime and default endpoint", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    await module.setup({ enabled: true }, nuxt);

    expect(nuxt.options.runtimeConfig.newsletterSignup).toEqual({
      enabled: true,
      endpoint: { enabled: true, url: "/api/newsletter/signup" }
    });
    expect(nuxt.options.runtimeConfig.public.newsletterSignup).toEqual({
      endpoint: { url: "/api/newsletter/signup" }
    });
    expect(addServerScanDir).toHaveBeenCalledTimes(1);
    expect(addImports).toHaveBeenCalledWith({
      name: "useNewsletterSignup",
      from: expect.stringContaining("runtime/app/composables/newsletterSignup")
    });
    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
  });

  it("does not override consumer API Shield configuration", async () => {
    const module = (await import("../src/module")).default;
    const dependencies = module.moduleDependencies;

    expect(dependencies).toMatchObject({
      "@nuxt/ui": { version: ">=4.0.0" }
    });
    expect(dependencies).not.toHaveProperty("nuxt-api-shield");
  });

  it("ignores endpoint.url while the local endpoint is enabled", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    await module.setup({ endpoint: { enabled: true, url: "/not-used" } }, nuxt);

    expect(nuxt.options.runtimeConfig.public.newsletterSignup).toEqual({
      endpoint: { url: "/api/newsletter/signup" }
    });
  });

  it("keeps the composable while using a remote endpoint", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    await module.setup(
      {
        endpoint: {
          enabled: false,
          url: "https://newsletter.example.com/api/newsletter/signup"
        }
      },
      nuxt
    );

    expect(addImports).toHaveBeenCalledTimes(1);
    expect(addServerScanDir).not.toHaveBeenCalled();
    expect(nuxt.options.runtimeConfig.public.newsletterSignup).toEqual({
      endpoint: { url: "https://newsletter.example.com/api/newsletter/signup" }
    });
  });

  it("exposes only non-secret list metadata to the client", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    await module.setup(
      {
        provider: "mailchimp",
        apiKey: "secret-key",
        server: "us4",
        lists: {
          default: "main",
          options: [{ label: "Main", id: "main", server: "us4" }]
        }
      },
      nuxt
    );

    expect(nuxt.options.runtimeConfig.public.newsletterSignup).toEqual({
      endpoint: { url: "/api/newsletter/signup" },
      lists: { default: "main", options: [{ label: "Main", id: "main" }] }
    });
  });

  it("rejects a disabled endpoint without a URL", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    expect(() => module.setup({ endpoint: { enabled: false } }, nuxt)).toThrow(
      "Invalid module options"
    );
    expect(logger.info).toHaveBeenCalledWith(
      "endpoint.url is required when endpoint registration is disabled"
    );
  });

  it("requires Mailchimp server values for configured audiences", async () => {
    const module = (await import("../src/module")).default;

    expect(() =>
      module.setup(
        {
          provider: "mailchimp",
          apiKey: "key",
          lists: { default: "audience" }
        },
        createNuxt()
      )
    ).toThrow("Invalid module options");
    expect(logger.info).toHaveBeenCalledWith(
      "server is required for Mailchimp when no per-audience server is configured"
    );
  });

  it("requires a server on every Mailchimp audience option", async () => {
    const module = (await import("../src/module")).default;

    expect(() =>
      module.setup(
        {
          provider: "mailchimp",
          apiKey: "key",
          lists: {
            options: [
              { label: "Main", id: "main", server: "us4" },
              { label: "Events", id: "events" }
            ]
          }
        },
        createNuxt()
      )
    ).toThrow("Invalid module options");
    expect(logger.info).toHaveBeenCalledWith(
      "Each Mailchimp list option requires its server value"
    );
  });

  it("requires a default list or selectable list options", async () => {
    const module = (await import("../src/module")).default;

    expect(() => module.setup({ provider: "loops", apiKey: "key" }, createNuxt())).toThrow(
      "Invalid module options"
    );
    expect(logger.info).toHaveBeenCalledWith("Configure lists.default or lists.options");
  });

  it("validates options before skipping a disabled module", async () => {
    const module = (await import("../src/module")).default;
    const nuxt = createNuxt();

    await module.setup({ enabled: false }, nuxt);

    expect(addTypeTemplate).toHaveBeenCalledTimes(1);
    expect(addImports).not.toHaveBeenCalled();
    expect(addServerScanDir).not.toHaveBeenCalled();
  });
});
