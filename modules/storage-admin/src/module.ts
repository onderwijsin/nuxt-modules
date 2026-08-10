import {
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
  useLogger
} from "@nuxt/kit";
import type { ModuleDependencies } from "@nuxt/schema";
import {
  moduleDependenciesWhenEnabled,
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { version } from "../package.json";
import { storageAdminOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "storageAdmin";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers protected CRUD endpoints for configured Nitro storage mounts. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  moduleDependencies: (nuxt): ModuleDependencies =>
    nuxt.options.dev &&
    nuxt.options.storageAdmin !== false &&
    nuxt.options.storageAdmin?.ui?.enabled !== false
      ? moduleDependenciesWhenEnabled(nuxt.options.storageAdmin, {
          "@nuxt/ui": { version: "^4.0.0" }
        })
      : {},
  defaults: {
    enabled: false,
    internalKeyPrefixes: ["__cache_meta:"],
    internalKeySuffixes: ["$"],
    mounts: {},
    ui: { enabled: true, path: "/_storage" },
    adminHeaderName: "x-admin-token",
    devAuthBypass: false,
    defaultLimit: 100,
    maxLimit: 500,
    maxListedKeys: 10_000
  },
  setup(rawOptions, nuxt) {
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/storage-admin-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });

    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, storageAdminOptionsSchema, log);
    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.storageAdmin = {
      enabled: options.enabled,
      adminToken: options.adminToken,
      adminHeaderName: options.adminHeaderName,
      devAuthBypass: options.devAuthBypass,
      internalKeyPrefixes: options.internalKeyPrefixes,
      internalKeySuffixes: options.internalKeySuffixes,
      mounts: options.mounts,
      ui: options.ui,
      defaultLimit: options.defaultLimit,
      maxLimit: options.maxLimit,
      maxListedKeys: options.maxListedKeys
    };
    if (nuxt.options.dev && options.devAuthBypass) {
      log.warn(
        "Development authentication bypass is enabled. Storage administration is unauthenticated."
      );
    }
    transpileRuntime(nuxt, runtimeDir);
    addServerScanDir(resolver.resolve(runtimeDir, "server"));

    if (nuxt.options.dev && options.ui.enabled) {
      extendPages((pages) => {
        pages.push({
          name: "storage-admin",
          path: options.ui.path,
          file: resolver.resolve(runtimeDir, "app/pages/storage-admin.vue"),
          meta: { robots: "noindex", sitemap: false }
        });
      });
    }

    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules["/api/_storage/**"] = {
      ...nuxt.options.routeRules["/api/_storage/**"],
      cache: false,
      prerender: false
    };
    if (nuxt.options.dev && options.ui.enabled) {
      nuxt.options.routeRules[options.ui.path] = {
        ...nuxt.options.routeRules[options.ui.path],
        cache: false,
        prerender: false
      };
    }

    end();
  }
});
