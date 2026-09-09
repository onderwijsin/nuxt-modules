import { defu } from "defu";
import { isRecord, isFunction, hasKey, isString } from "@onderwijsin/nuxt-module-utils/shared";
import type { Nuxt, ModuleDependencies } from "@nuxt/schema";
import { getResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema";
import { getResolvedDirectusConfigFromSource } from "@onderwijsin/nuxt-directus-config/config";
/**
 * Checks whether the given value is a Directus config module.
 * @param module The module to check.
 * @returns True if the module is a Directus config module, false otherwise.
 */
function isDirectusConfigModule(module: unknown): boolean {
  if (module === "@onderwijsin/nuxt-directus-config") return true;
  if (!isFunction(module) && !isRecord(module)) return false;
  if (!hasKey(module, "meta") || !isRecord(module.meta)) return false;
  return module.meta.name === "@onderwijsin/nuxt-directus-config";
}

/**
 * Resolves the module dependencies for the Directus client module.
 * This includes checking if the Directus config module and Turnstile module are required.
 *
 * @param nuxt The Nuxt instance.
 * @returns A promise that resolves to the module dependencies.
 */
export async function resolveModuleDependencies(nuxt: Nuxt): Promise<ModuleDependencies> {
  const isDirectusConfigModuleRegistered = nuxt.options.modules.some(isDirectusConfigModule);
  const dependencies: ModuleDependencies = {};

  // If the Directus config module is registered, add it to the dependencies.
  if (isDirectusConfigModuleRegistered) {
    dependencies["@onderwijsin/nuxt-directus-config"] = { version: ">=0.3.0" };
  }

  let sharedConfig;
  if (isDirectusConfigModuleRegistered) {
    const directusConfigOptions = Reflect.get(nuxt.options, "directusConfig");
    const configFile: string | false =
      isRecord(directusConfigOptions) &&
      (isString(directusConfigOptions.configFile) || directusConfigOptions.configFile === false)
        ? directusConfigOptions.configFile
        : "directus.config.ts";

    if (configFile) {
      sharedConfig =
        getResolvedDirectusConfig(nuxt) ??
        (await getResolvedDirectusConfigFromSource(nuxt.options.rootDir, configFile));
    }
  }

  const effectiveConfig = defu(nuxt.options.directusClient, sharedConfig);

  if (effectiveConfig?.client?.auth?.turnstile?.enabled) {
    dependencies["@onderwijsin/nuxt-turnstile"] = { version: ">=0.2.5" };
  }
  return dependencies;
}
