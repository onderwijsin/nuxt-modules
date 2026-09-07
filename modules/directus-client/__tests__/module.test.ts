import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sharedConfig: {
    instance: { baseUrl: "https://directus.example.test" },
    client: {
      auth: {
        enabled: true,
        sessionSecret: "shared-directus-session-secret-32-chars",
        user: {
          enabled: true,
          fields: ["first_name"],
          mapper: (user: Record<string, unknown>) => ({ name: user.first_name })
        }
      }
    }
  },
  addTemplate: vi.fn(),
  addServerTemplate: vi.fn(),
  addTypeTemplate: vi.fn()
}));

vi.mock("@nuxt/kit", () => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler: vi.fn(),
  addServerImports: vi.fn(),
  addServerPlugin: vi.fn(),
  addServerTemplate: state.addServerTemplate,
  addTemplate: state.addTemplate,
  addTypeTemplate: state.addTypeTemplate,
  createResolver: () => ({ resolve: (...parts: string[]) => join("/module", ...parts) }),
  defineNuxtModule: (definition: unknown) => definition,
  useLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig: () => state.sharedConfig
}));
vi.mock("@onderwijsin/nuxt-directus-config/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/config")>()),
  getResolvedDirectusConfigFromSource: vi.fn(),
  resolveDirectusConfigFile: () => "/project/directus.config.ts"
}));
vi.mock("@onderwijsin/nuxt-module-utils/build", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/build")>()),
  moduleSetup: () => ({ start: vi.fn(), end: vi.fn(), isEnabled: () => true }),
  transpileRuntime: vi.fn(),
  validateModuleOptions: (value: unknown, schema: { parse: (input: unknown) => unknown }) =>
    schema.parse(value)
}));

const module = (await import("../src/module")).default as {
  setup: (options: unknown, nuxt: unknown) => Promise<void> | void;
};

function createNuxt() {
  return {
    options: {
      _prepare: true,
      dev: false,
      rootDir: "/project",
      buildDir: "/project/.nuxt",
      modules: [],
      directusConfig: {},
      alias: {},
      runtimeConfig: { public: {} },
      typescript: {
        tsConfig: { compilerOptions: { paths: {} } },
        nodeTsConfig: { compilerOptions: { paths: {} } }
      }
    }
  };
}

beforeEach(() => {
  state.addTemplate.mockReset();
  state.addTemplate.mockImplementation(({ filename }: { filename: string }) => ({
    dst: `/project/.nuxt/${filename}`
  }));
  state.addServerTemplate.mockReset();
  state.addTypeTemplate.mockReset();
  state.addTypeTemplate.mockReturnValue({ dst: "/project/.nuxt/types/generated.d.ts" });
});

describe("directus-client module setup", () => {
  it("rejects mapper functions supplied through raw Nuxt options", async () => {
    expect(() =>
      module.setup(
        {
          client: {
            auth: {
              enabled: true,
              sessionSecret: "raw-directus-session-secret-32-chars",
              user: { enabled: true, fields: ["id"], mapper: () => ({}) }
            }
          }
        },
        createNuxt()
      )
    ).toThrow();
  });

  it("does not expose a shared mapper when raw auth.user wins atomically", async () => {
    const nuxt = createNuxt();
    await module.setup(
      {
        client: {
          auth: {
            enabled: true,
            sessionSecret: "raw-directus-session-secret-32-chars",
            user: { enabled: true, fields: ["email"] }
          }
        }
      },
      nuxt
    );

    const userConfigTemplate = state.addTemplate.mock.calls.find(
      ([template]) => template.filename === "directus-user-config-server.mjs"
    )?.[0] as { getContents: () => string } | undefined;
    expect(userConfigTemplate?.getContents()).toBe("export default undefined;\n");

    const userTypeTemplate = state.addTypeTemplate.mock.calls.find(
      ([template]) => template.filename === "types/directus-user.d.ts"
    )?.[0] as { getContents: () => string } | undefined;
    expect(userTypeTemplate?.getContents()).not.toContain("DirectusConfigSource");
    expect(nuxt.options.runtimeConfig.directusClient.auth.user).toEqual({
      enabled: true,
      fields: ["email"]
    });
  });
});
