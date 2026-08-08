import { defineNuxtModule, useLogger, createResolver, addImportsDir } from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleDependenciesWhenEnabled,
  resolveModuleName,
  resolveLoggerScope,
  moduleSetup
} from "@onderwijsin/nuxt-module-utils/shared";

import { version } from "../package.json";
import type { ModuleOptions } from "./types";

const MODULE_KEY = "uiFormExtensions";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/**
 * Provides the Nuxt UI form extensions module.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: {
      nuxt: "^4.0.0"
    }
  },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.uiFormExtensions, {
      "@nuxt/ui": { version: ">=4.0.0" }
    }),
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);

    start();

    if (!isEnabled()) {
      return;
    }

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    nuxt.options.build.transpile.push(runtimeDir);
    addImportsDir(resolver.resolve(runtimeDir, "app", "composables"));

    end();
  }
});
