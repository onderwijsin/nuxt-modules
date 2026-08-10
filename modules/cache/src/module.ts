import {
  addServerScanDir,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger
} from "@nuxt/kit";
import { defu } from "defu";
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "@onderwijsin/nuxt-module-utils/build";
import { version } from "../package.json";
import { cacheOptionsSchema } from "./config/options.schema";
import type { ModuleOptions } from "./types/options";

const MODULE_KEY = "cache";
const MODULE_NAME = resolveModuleName(MODULE_KEY);

/** Registers cache metadata types and the protected targeted invalidation endpoint. */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: MODULE_KEY,
    version,
    compatibility: { nuxt: "^4.0.0" }
  },
  defaults: {
    enabled: false,
    adminHeaderName: "x-admin-token",
    devAuthBypass: false,
    maxInvalidatedEntries: 1_000
  },
  setup(rawOptions, nuxt) {
    const resolver = createResolver(import.meta.url);
    const runtimeDir = resolver.resolve("./runtime");

    addTypeTemplate({
      filename: "types/cache-config.d.ts",
      src: resolver.resolve(runtimeDir, "types/config.d.ts")
    });

    const log = useLogger(resolveLoggerScope(MODULE_KEY));
    const { start, end, isEnabled } = moduleSetup(MODULE_NAME, rawOptions, log);
    start();

    const options = validateModuleOptions(rawOptions, cacheOptionsSchema, log);
    if (!isEnabled()) return;

    nuxt.options.runtimeConfig.nuxtCache = defu(
      {
        enabled: options.enabled,
        adminToken: options.adminToken,
        adminHeaderName: options.adminHeaderName,
        devAuthBypass: options.devAuthBypass,
        maxInvalidatedEntries: options.maxInvalidatedEntries
      },
      nuxt.options.runtimeConfig.nuxtCache ?? {}
    );
    if (nuxt.options.dev && options.devAuthBypass) {
      log.warn(
        "Development authentication bypass is enabled. Cache invalidation is unauthenticated."
      );
    }

    transpileRuntime(nuxt, runtimeDir);
    // The cache driver reads the active Nitro event to associate writes with request paths.
    nuxt.options.nitro = defu(
      {
        experimental: {
          asyncContext: true
        }
      },
      nuxt.options.nitro ?? {}
    );
    addServerScanDir(resolver.resolve(runtimeDir, "server"));
    nuxt.options.routeRules ??= {};
    nuxt.options.routeRules["/api/_cache/**"] = {
      ...nuxt.options.routeRules["/api/_cache/**"],
      cache: false,
      prerender: false
    };

    end();
  }
});
