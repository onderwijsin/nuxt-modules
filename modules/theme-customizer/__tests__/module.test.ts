import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromEntries } from "@onderwijsin/nuxt-module-utils/shared";

const kit = vi.hoisted(() => ({
  addComponentsDir: vi.fn(),
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler: vi.fn(),
  addTemplate: vi.fn((template: { filename: string }) => ({ dst: `./${template.filename}` })),
  addTypeTemplate: vi.fn(),
  createResolver: vi.fn(() => ({ resolve: vi.fn((...parts: string[]) => parts.join("/")) })),
  defineNuxtModule: vi.fn((definition) => definition),
  extendPages: vi.fn(),
  extendRouteRules: vi.fn(),
  useLogger: vi.fn(() => ({ start: vi.fn(), success: vi.fn(), info: vi.fn() }))
}));

vi.mock("@nuxt/kit", () => kit);
vi.mock("node:fs", () => ({ readFileSync: vi.fn(() => "@theme static {}") }));

import themeCustomizerModule from "../src/module";
import type { ThemePalette } from "../src/types";

const moduleDefinition = themeCustomizerModule as unknown as {
  meta: Record<string, unknown>;
  moduleDependencies: (nuxt: {
    options: { themeCustomizer?: { enabled?: boolean } | false };
  }) => Record<string, unknown>;
  defaults: (nuxt: { options: { dev: boolean } }) => Record<string, unknown>;
  setup: (options: Record<string, unknown>, nuxt: never) => void;
};

const palette = fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [shade, "#ff0000"])
) as ThemePalette;

type MockNuxt = {
  options: {
    dev: boolean;
    appConfig: { ui: { colors: Record<string, string> } };
    ui: { theme: { colors: string[] } };
    runtimeConfig: {
      public: {
        themeCustomizer: {
          groups: Record<string, string[]>;
          googleFonts?: { families: string[] };
        };
      };
    };
    css: string[];
    build: { transpile: string[] };
  };
};

describe("theme customizer module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults Google Fonts to the curated family list", () => {
    expect(moduleDefinition.defaults({ options: { dev: true } })).toEqual({
      enabled: true,
      googleFonts: {
        families: [
          "Public Sans",
          "Roboto",
          "Open Sans",
          "Lato",
          "Montserrat",
          "DM Sans",
          "Inter",
          "Poppins",
          "Nunito Sans",
          "Raleway",
          "Merriweather",
          "Playfair Display"
        ]
      },
      rateLimit: {
        palette: { enabled: true, max: 30, duration: 60, ban: 300 },
        fonts: { enabled: true, max: 60, duration: 60, ban: 300 }
      }
    });
  });

  it("exposes the package identity and Nuxt UI dependencies", () => {
    expect(moduleDefinition.meta).toMatchObject({
      name: "@onderwijsin/nuxt-theme-customizer",
      configKey: "themeCustomizer",
      compatibility: { nuxt: "^4.0.0" }
    });
    expect(moduleDefinition.moduleDependencies({ options: {} })).toMatchObject({
      "@nuxt/ui": { version: "^4.6.1" },
      "@pinia/nuxt": { version: "^1.0.1" },
      "pinia-plugin-persistedstate": { version: "^4.7.1" },
      "@vueuse/nuxt": { version: "^14.3.0" },
      "@onderwijsin/nuxt-simple-rate-limiter": { version: "^0.3.0" }
    });
    expect(
      moduleDefinition.moduleDependencies({ options: { themeCustomizer: { enabled: false } } })
    ).toEqual({});
  });

  it("registers runtime assets and preserves custom groups", () => {
    const nuxt: MockNuxt = {
      options: {
        dev: true,
        appConfig: { ui: { colors: {} } },
        ui: { theme: { colors: [] } },
        runtimeConfig: { public: { themeCustomizer: { groups: {} } } },
        css: [],
        build: { transpile: [] }
      }
    };

    moduleDefinition.setup(
      {
        enabled: true,
        primary: { ocean: palette },
        neutral: {},
        accent: { coral: palette }
      },
      nuxt as never
    );

    expect(nuxt.options.build.transpile).toEqual(["./runtime"]);
    expect(kit.addComponentsDir).toHaveBeenCalledWith({
      path: "./runtime/app/components",
      pathPrefix: false,
      prefix: "ThemeCustomizer"
    });
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "./runtime/app/plugins/theme-customizer.client",
      mode: "client"
    });
    expect(kit.addImports).toHaveBeenCalledWith({
      name: "useThemeCustomizerConfirmDialog",
      from: "./runtime/app/composables/confirm-dialog"
    });
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      handler: "./runtime/server/api/theme/palette.get",
      route: "/api/_theme-customizer/palette"
    });
    expect(kit.addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "theme-customizer.generated.css",
        write: true
      })
    );
    expect(nuxt.options.runtimeConfig.public.themeCustomizer).toEqual({
      groups: {
        primary: ["ocean"],
        neutral: [],
        accent: ["coral"]
      },
      googleFonts: { families: [] },
      rateLimit: {
        palette: { enabled: true, max: 30, duration: 60, ban: 300 },
        fonts: { enabled: true, max: 60, duration: 60, ban: 300 }
      },
      defaults: { font: "Public Sans" }
    });
    expect(nuxt.options.ui.theme.colors).toEqual(["accent"]);
    expect(kit.extendPages).toHaveBeenCalled();
    expect(kit.extendRouteRules).toHaveBeenCalledWith("/thema", {
      cache: false,
      prerender: false,
      ssr: false
    });
  });

  it("uses a configured editor route and stable route name", () => {
    const nuxt: MockNuxt = {
      options: {
        dev: true,
        appConfig: { ui: { colors: {} } },
        ui: { theme: { colors: [] } },
        runtimeConfig: { public: { themeCustomizer: { groups: {} } } },
        css: [],
        build: { transpile: [] }
      }
    };

    moduleDefinition.setup(
      { enabled: true, route: "/custom-theme", primary: { ocean: palette } },
      nuxt as never
    );

    const pagesCallback = kit.extendPages.mock.calls.at(-1)?.[0];
    const pages: Array<Record<string, unknown>> = [];
    pagesCallback?.(pages);

    expect(pages[0]).toMatchObject({ name: "theme-customizer", path: "/custom-theme" });
    expect(kit.extendRouteRules).toHaveBeenLastCalledWith("/custom-theme", {
      cache: false,
      prerender: false,
      ssr: false
    });
  });

  it("registers type declarations but skips runtime registration when disabled", () => {
    const nuxt = { options: { dev: true, build: { transpile: [] } } };

    moduleDefinition.setup({ enabled: false }, nuxt as never);

    expect(nuxt.options.build.transpile).toEqual([]);
    expect(kit.addTypeTemplate).toHaveBeenCalledWith({
      filename: "types/theme-customizer.d.ts",
      src: "./runtime/types/theme-customizer.d.ts"
    });
    expect(kit.addComponentsDir).not.toHaveBeenCalled();
  });

  it("rejects incomplete palettes", () => {
    const nuxt = { options: { dev: true, build: { transpile: [] } } };

    expect(() =>
      moduleDefinition.setup({ primary: { ocean: { 500: "#fff000" } } }, nuxt as never)
    ).toThrow("Invalid module options");
  });

  it("requires at least one primary palette when enabled", () => {
    const nuxt = { options: { dev: true, build: { transpile: [] } } };

    expect(() => moduleDefinition.setup({}, nuxt as never)).toThrow("Invalid module options");
  });

  it("rejects incomplete custom-group palettes", () => {
    const nuxt = { options: { dev: true, build: { transpile: [] } } };

    expect(() =>
      moduleDefinition.setup({ accent: { coral: { 500: "#fff000" } } }, nuxt as never)
    ).toThrow("Invalid module options");
  });
});
