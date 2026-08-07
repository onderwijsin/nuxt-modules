import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  addTemplate: vi.fn(),
  defineNuxtModule: vi.fn((definition) => definition),
  logger: { start: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() },
  useLogger: vi.fn()
}));
kit.useLogger.mockReturnValue(kit.logger);

vi.mock("@nuxt/kit", () => kit);
vi.mock("../src/utils", () => ({
  generateWebManifest: vi.fn(() => ({ name: "Example" })),
  resolveIconConfig: vi.fn(() => ({ warnings: [] }))
}));

import webmanifestModule from "../src/module";
import { resolveIconConfig } from "../src/utils";

const definition = webmanifestModule as unknown as {
  meta: Record<string, unknown>;
  moduleDependencies: Record<string, unknown>;
  setup: (options: Record<string, unknown>, nuxt: never) => void;
};

const createNuxt = (dev = false) => ({
  options: {
    dev,
    buildDir: ".nuxt",
    runtimeConfig: { public: { siteUrl: "https://example.com" } },
    app: {} as { head?: { link?: unknown[] } },
    nitro: {} as { publicAssets?: unknown[] }
  }
});

describe("webmanifest module", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes publishable identity and required module dependencies", () => {
    expect(definition.meta).toMatchObject({
      name: "@onderwijsin/nuxt-webmanifest",
      configKey: "webmanifest",
      compatibility: { nuxt: "^4.0.0" }
    });
    expect(definition.moduleDependencies).toEqual({
      "@nuxt/image": { version: ">=2.0.0" },
      "nuxt-site-config": { version: ">=4.0.0" },
      "nuxt-schema-org": { version: ">=6.0.0" }
    });
  });

  it("does not generate in development or when disabled", () => {
    definition.setup({ enabled: true }, createNuxt(true) as never);
    definition.setup({ enabled: false }, createNuxt() as never);
    expect(kit.addTemplate).not.toHaveBeenCalled();
  });

  it("registers the manifest template, public asset, and head link", () => {
    const nuxt = createNuxt();
    definition.setup({ enabled: true, manifest: {} }, nuxt as never);

    expect(kit.addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "templates/webmanifest/app.webmanifest", write: true })
    );
    expect(nuxt.options.nitro.publicAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ maxAge: 60 * 60 * 24 * 7 })])
    );
    expect(nuxt.options.app.head?.link).toEqual([{ rel: "manifest", href: "/app.webmanifest" }]);
  });

  it("logs icon configuration warnings from module setup", async () => {
    vi.mocked(resolveIconConfig).mockReturnValueOnce({
      warnings: ["Configure image.provider before generating webmanifest icons."]
    });
    const nuxt = createNuxt();
    definition.setup({ enabled: true, manifest: {} }, nuxt as never);

    expect(kit.logger.warn).toHaveBeenCalledWith(
      "Configure image.provider before generating webmanifest icons."
    );
  });
});
