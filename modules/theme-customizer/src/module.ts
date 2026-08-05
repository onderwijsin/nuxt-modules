import { readFileSync } from "node:fs";

import {
  addComponentsDir,
  addImports,
  addPlugin,
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
  extendRouteRules,
  useLogger
} from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  validateModuleOptions
} from "module-utils";
import { version } from "../package.json";
import { parseThemeOptions, themeOptionsShape } from "./config/options.schema";
import {
  configuredAppColors,
  configuredGroups,
  configuredRuntimeGroups,
  configuredUiColors,
  generateThemeCss
} from "./config/theme";
import type { ThemeCustomizerOptions } from "./types";

export { THEME_SHADES } from "./types";
export type { ThemeFontOption, ThemeGoogleFontsOptions, ThemePalette, ThemeShade } from "./types";
/** Maps a theme color group to its named palettes. */
export type { ThemeColorGroups, ThemeCustomizerOptions } from "./types";

const MODULE_KEY = "themeCustomizer";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers the theme customizer UI, persisted state, and `/thema` route. */
export default defineNuxtModule<ThemeCustomizerOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: {
      nuxt: "^4.0.0"
    }
  },
  moduleDependencies: {
    "@nuxt/ui": {
      version: "^4.6.1"
    },
    "@pinia/nuxt": {
      version: "^1.0.1"
    },
    "pinia-plugin-persistedstate": {
      version: "^4.7.1"
    },
    "@vueuse/nuxt": {
      version: "^14.3.0"
    }
  },
  defaults: (nuxt) => ({
    enabled: nuxt.options.dev,
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
    }
  }),
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);

    start();
    if (!isEnabled()) return;

    validateModuleOptions(rawOptions, themeOptionsShape, log);
    const options = parseThemeOptions(rawOptions);

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    const neutralTheme = readFileSync(resolver.resolve(runtimeDir, "assets/theme.css"), "utf8");
    const groups = configuredGroups(options);
    const generatedTheme = addTemplate({
      filename: "theme-customizer.generated.css",
      write: true,
      getContents: () => generateThemeCss(groups, neutralTheme)
    });

    nuxt.options.css.push(generatedTheme.dst);
    const nuxtOptions = nuxt.options as typeof nuxt.options & {
      ui?: { theme?: { colors?: string[] } };
    };
    nuxtOptions.ui ??= {};
    nuxtOptions.ui.theme ??= {};
    nuxtOptions.ui.theme.colors = configuredUiColors(groups, nuxtOptions.ui.theme.colors);

    nuxt.options.runtimeConfig.public.themeCustomizer = {
      groups: configuredRuntimeGroups(groups) as never,
      googleFonts: {
        families: options.googleFonts?.families ?? []
      }
    };
    if (options.googleFonts?.apiKey) {
      nuxt.options.runtimeConfig.themeCustomizerGoogleFontsApiKey = options.googleFonts.apiKey;
    }
    addTypeTemplate({
      filename: "types/theme-customizer.d.ts",
      src: resolver.resolve("./types/theme-customizer.d.ts")
    });
    const appConfig = nuxt.options.appConfig as {
      ui?: { colors?: Record<string, string> };
    };
    appConfig.ui ??= {};
    appConfig.ui.colors = configuredAppColors(groups, appConfig.ui.colors);
    addComponentsDir({
      path: resolver.resolve(runtimeDir, "app/components"),
      pathPrefix: false
    });
    addImports({
      name: "useGeneratedPalette",
      from: resolver.resolve(runtimeDir, "app/composables/generated-palette.client")
    });
    addImports({
      name: "useConfirmDialog",
      from: resolver.resolve(runtimeDir, "app/composables/confirm-dialog")
    });
    addImports({
      name: "useThemeCustomizerStore",
      from: resolver.resolve(runtimeDir, "app/stores/theme-customizer")
    });
    addPlugin({
      src: resolver.resolve(runtimeDir, "app/plugins/theme-customizer.client"),
      mode: "client"
    });
    addServerHandler({
      handler: resolver.resolve(runtimeDir, "server/api/theme/palette.get"),
      route: "/api/theme/palette"
    });
    addServerHandler({
      handler: resolver.resolve(runtimeDir, "server/api/theme/fonts.get"),
      route: "/api/theme/fonts"
    });
    extendPages((pages) => {
      pages.push({
        name: "theme",
        path: "/thema",
        file: resolver.resolve(runtimeDir, "app/pages/thema.vue"),
        meta: {
          robots: "noindex",
          sitemap: false
        }
      });
    });
    extendRouteRules("/thema", {
      cache: false,
      prerender: false
    });

    nuxt.options.build.transpile.push(runtimeDir);
    end();
  }
});
