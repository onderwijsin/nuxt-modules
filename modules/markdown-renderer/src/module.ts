import { addComponentsDir, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { version } from "../package.json";
import { markdownRendererOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "markdownRenderer";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers the MarkdownRenderer component for Nuxt applications. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: { enabled: true },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.markdownRenderer, {
      "@comark/nuxt": { version: ">=0.7.0" },
      "@nuxt/ui": { version: ">=4.0.0" },
      "nuxt-component-meta": { version: ">=0.18.0" }
    }),
  setup(_options, nuxt) {
    const log = useLogger(MODULE_KEY);
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, _options, log);
    start();
    validateModuleOptions(_options, markdownRendererOptionsSchema, log);

    if (!isEnabled()) return;

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    transpileRuntime(nuxt, runtimeDir);
    addComponentsDir({
      path: resolver.resolve(runtimeDir, "app", "components"),
      pathPrefix: false
    });

    end();
  }
});
