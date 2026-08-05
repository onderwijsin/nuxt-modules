import { addComponentsDir, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import { moduleSetup, resolveLoggerScope, resolveModuleName } from "module-utils";

import { version } from "../package.json";
import type { ModuleOptions } from "./types";

const MODULE_KEY = "loopsRenderer";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/**
 * Provides the Nuxt runtime foundation for rendering Loops LMX email content.
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
  defaults: {
    applyInlineStyles: true
  },
  moduleDependencies: {
    "@nuxt/ui": {
      version: ">=4.0.0"
    }
  },
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);

    start();

    if (!isEnabled()) {
      return;
    }

    nuxt.options.appConfig.loopsRenderer = {
      applyInlineStyles: options.applyInlineStyles ?? true
    };
    Object.assign(nuxt.options.appConfig.loopsRenderer as object, {
      evaluate: options.evaluate
    });

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    nuxt.options.build.transpile.push(runtimeDir);
    addComponentsDir({
      path: resolver.resolve(runtimeDir, "app", "components"),
      pathPrefix: false
    });

    end();
  }
});
