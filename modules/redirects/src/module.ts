import { resolve } from "node:path";

import {
  addPlugin,
  addServerHandler,
  addServerPlugin,
  addServerScanDir,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { defu } from "defu";

import { version } from "../package.json";
import { redirectsOptionsSchema } from "./config/options.schema";
import { discoverRedirectSources, generateRedirectsSourceRegistry } from "./config/sources";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "redirects";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers provider-agnostic redirect indexing, endpoints, and optional runtime middleware. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: {
    enabled: true,
    serverMiddleware: true,
    store: true,
    routeMiddleware: true,
    dynamicMatching: false
  },
  moduleDependencies: (nuxt): ModuleDependencies =>
    nuxt.options.redirects !== false && nuxt.options.redirects?.store !== false
      ? {
          "@pinia/nuxt": { version: "^1.0.0" },
          "pinia-plugin-persistedstate/nuxt": { version: "^4.0.0" }
        }
      : {},
  setup(rawOptions, nuxt) {
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");
    addTypeTemplate({
      filename: "types/redirects-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });

    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, redirectsOptionsSchema, log);
    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.redirects = defu(nuxt.options.runtimeConfig.redirects, {
      serverMiddleware: options.serverMiddleware,
      dynamicMatching: options.dynamicMatching,
      storageMount: options.storageMount,
      excludedNamespaces: options.excludedNamespaces,
      excludedRoutes: options.excludedRoutes,
      cache: options.cache
    });
    nuxt.options.runtimeConfig.public.redirects = defu(
      nuxt.options.runtimeConfig.public.redirects,
      {
        store: options.store,
        routeMiddleware: options.routeMiddleware,
        dynamicMatching: options.dynamicMatching,
        storeRefreshInterval: options.storeRefreshInterval,
        excludedNamespaces: options.excludedNamespaces,
        excludedRoutes: options.excludedRoutes
      }
    );

    transpileRuntime(nuxt, runtimeDir);
    addServerScanDir(resolver.resolve(runtimeDir, "server"));
    if (options.serverMiddleware) {
      addServerHandler({
        middleware: true,
        handler: resolver.resolve(runtimeDir, "server/middleware/redirects")
      });
    }
    if (options.store || options.routeMiddleware) {
      addPlugin(resolver.resolve(runtimeDir, "app/plugins/redirects.client"), { append: true });
    }

    const registry = addTemplate({
      filename: "redirects-source-registry.mjs",
      write: true,
      getContents: () =>
        generateRedirectsSourceRegistry(
          discoverRedirectSources(resolve(nuxt.options.serverDir, "redirects"))
        )
    });
    addServerPlugin(registry.dst);
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules["/api/_redirects/**"] = {
      ...nuxt.options.routeRules["/api/_redirects/**"],
      prerender: false
    };
    end();
  }
});
