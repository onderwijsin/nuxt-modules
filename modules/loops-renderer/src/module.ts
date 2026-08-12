import { addComponentsDir, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime
} from "@onderwijsin/nuxt-module-utils/build";

import { version } from "../package.json";
import { EVALUATE_DEFAULTS, loopsRendererOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./config/options.schema";

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
    enabled: true,
    applyInlineStyles: true,
    evaluate: EVALUATE_DEFAULTS
  },
  moduleDependencies: (nuxt): ModuleDependencies =>
    moduleDependenciesWhenEnabled(nuxt.options.loopsRenderer, {
      "@nuxt/ui": { version: ">=4.0.0" }
    }),
  setup(options, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);

    start();

    if (!isEnabled()) {
      return;
    }

    const validatedOptions = loopsRendererOptionsSchema.parse(options);
    nuxt.options.appConfig.loopsRenderer = {
      applyInlineStyles: validatedOptions.applyInlineStyles,
      evaluate: validatedOptions.evaluate
    };

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
