import { createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName
} from "@onderwijsin/nuxt-module-utils/build";
import { isNonBlankString } from "@onderwijsin/nuxt-module-utils/shared";

import { resolveModuleDependencies } from "./config/dependencies";
import { setupDirectusAuth } from "./config/setup-auth";
import { resolveDirectusSetupContext } from "./config/setup-context";
import { setupDirectusAssets, setupDirectusProxy } from "./config/setup-proxies";
import { setupDirectusClient, setupDirectusRuntimeConfig } from "./config/setup-runtime";
import { setupDirectusTypegen } from "./config/setup-typegen";
import { version } from "../package.json";
import type { ModuleOptions } from "./config/options.schema";

const MODULE_KEY = "directusClient";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers the server-safe Directus module foundation and its validated proxy boundary. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: {
    enabled: true,
    instance: {},
    client: {}
  },
  moduleDependencies: resolveModuleDependencies,
  setup(rawOptions, nuxt) {
    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const context = resolveDirectusSetupContext(
      rawOptions,
      nuxt,
      createResolver(import.meta.url),
      log
    );
    setupDirectusTypegen(context);
    if (!isEnabled()) return;

    if (!isNonBlankString(context.baseUrl) && !nuxt.options._prepare && process.env.CI !== "true") {
      log.warn("Directus baseUrl is not set. Disabling Directus module.");
      return;
    }

    setupDirectusRuntimeConfig(context);
    setupDirectusClient(context);
    setupDirectusAuth(context);
    setupDirectusProxy(context);
    setupDirectusAssets(context);
    end();
  }
});
