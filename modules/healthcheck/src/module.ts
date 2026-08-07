import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import { defu } from "defu";
import { moduleSetup, resolveLoggerScope, resolveModuleName } from "module-utils/shared";

import {
  discoverHealthcheckComponents,
  generateHealthcheckComponentHandler
} from "./config/components";
import { healthcheckOptionsSchema } from "./config/options.schema";
import { version } from "../package.json";
import type { ModuleOptions, ResolvedModuleOptions } from "./types/options";

const MODULE_KEY = "healthcheck";
const MODULE_NAME = resolveModuleName(MODULE_KEY);
const DEFAULTS = {
  enabled: true,
  cache: { enabled: true },
  cloudinary: { enabled: false },
  directus: { enabled: false }
};

/** Registers configurable system health endpoints and server-side health components. */
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

    const parsed = healthcheckOptionsSchema.safeParse(defu(rawOptions, DEFAULTS));
    if (!parsed.success) {
      log.error(`Invalid ${MODULE_NAME} options:\n${parsed.error.message}`);
      throw new Error(`Invalid ${MODULE_NAME} options. See the validation errors above.`);
    }
    const options = parsed.data as ResolvedModuleOptions;

    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/healthcheck-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });

    if (!isEnabled()) return;

    const componentDirectory = resolve(nuxt.options.srcDir, "server/healthcheck");
    const components = discoverHealthcheckComponents(componentDirectory);
    const healthHandler = addTemplate({
      filename: "healthcheck-handler.mjs",
      write: true,
      getContents: () =>
        generateHealthcheckComponentHandler(
          discoverHealthcheckComponents(componentDirectory),
          resolver.resolve(runtimeDir, "server/utils/health"),
          resolver.resolve(runtimeDir, "index")
        )
    });

    nuxt.options.runtimeConfig.healthcheck = defu(nuxt.options.runtimeConfig.healthcheck, {
      enabled: options.enabled,
      cache: options.cache,
      cloudinary: options.cloudinary,
      directus: options.directus
    });
    nuxt.options.build.transpile.push(runtimeDir);

    addServerHandler({
      route: "/api/system/ping",
      handler: resolver.resolve(runtimeDir, "server/api/system/ping.get")
    });
    addServerHandler({
      route: "/api/system/health",
      handler: healthHandler.dst
    });

    nuxt.options.routeRules = nuxt.options.routeRules ?? {};
    nuxt.options.routeRules["/api/system/**"] = {
      ...(nuxt.options.routeRules["/api/system/**"] || {}),
      cache: false,
      prerender: false
    };

    if (components.length || existsSync(componentDirectory)) {
      log.info(
        `Registered ${components.length} custom healthcheck component${components.length === 1 ? "" : "s"}.`
      );
    }

    end();
  }
});
