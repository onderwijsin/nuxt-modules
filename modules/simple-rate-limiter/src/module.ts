import { addServerImports, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import { defu } from "defu";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";

import { simpleRateLimiterOptionsSchema } from "./config/options.schema";
import { version } from "../package.json";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "simpleRateLimiter";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULTS = {
  enabled: true,
  global: {
    enabled: false,
    pruning: {
      enabled: false,
      staleAfter: 24 * 60 * 60
    }
  }
} satisfies Required<ModuleOptions>;

/** Registers the server-only rate limiter auto-import. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: DEFAULTS,
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, simpleRateLimiterOptionsSchema, log);
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.simpleRateLimiter = defu(
      nuxt.options.runtimeConfig.simpleRateLimiter,
      { global: options.global }
    );

    transpileRuntime(nuxt, runtimeDir);

    addServerImports({
      name: "enforceRateLimit",
      from: runtimeDir
    });
    addServerImports({
      name: "enforceGlobalRateLimit",
      from: runtimeDir
    });

    end();
  }
});
