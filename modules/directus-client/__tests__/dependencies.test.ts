import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  resolvedConfig: undefined as Record<string, unknown> | undefined,
  sourceConfig: undefined as Record<string, unknown> | undefined
}));

vi.mock("@onderwijsin/nuxt-directus-config/schema", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/schema")>()),
  getResolvedDirectusConfig: () => state.resolvedConfig
}));
vi.mock("@onderwijsin/nuxt-directus-config/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-directus-config/config")>()),
  getResolvedDirectusConfigFromSource: vi.fn(() => state.sourceConfig)
}));

const { resolveModuleDependencies } = await import("../src/config/dependencies");

function createNuxt(
  directusClient: Record<string, unknown> | undefined,
  modules: unknown[] = ["@onderwijsin/nuxt-directus-config"]
) {
  return {
    options: {
      directusClient,
      directusConfig: {},
      modules,
      rootDir: "/project"
    }
  } as never;
}

function turnstileConfig(enabled: boolean) {
  return { client: { auth: { turnstile: { enabled } } } };
}

beforeEach(() => {
  state.resolvedConfig = undefined;
  state.sourceConfig = undefined;
});

describe("resolveModuleDependencies", () => {
  it.each([
    ["raw", turnstileConfig(true), undefined],
    ["shared", undefined, turnstileConfig(true)]
  ])("adds Turnstile when %s config enables it", async (_source, raw, shared) => {
    state.sourceConfig = shared;

    const dependencies = await resolveModuleDependencies(createNuxt(raw));

    expect(dependencies["@onderwijsin/nuxt-turnstile"]).toEqual({ version: ">=0.2.5" });
  });

  it("lets raw false override shared true", async () => {
    state.sourceConfig = turnstileConfig(true);

    const dependencies = await resolveModuleDependencies(createNuxt(turnstileConfig(false)));

    expect(dependencies["@onderwijsin/nuxt-turnstile"]).toBeUndefined();
  });

  it("adds Turnstile when raw true overrides shared false", async () => {
    state.sourceConfig = turnstileConfig(false);

    const dependencies = await resolveModuleDependencies(createNuxt(turnstileConfig(true)));

    expect(dependencies["@onderwijsin/nuxt-turnstile"]).toEqual({ version: ">=0.2.5" });
  });

  it("does not add Turnstile when it is disabled everywhere", async () => {
    state.sourceConfig = turnstileConfig(false);

    const dependencies = await resolveModuleDependencies(createNuxt(undefined));

    expect(dependencies["@onderwijsin/nuxt-turnstile"]).toBeUndefined();
  });
});
