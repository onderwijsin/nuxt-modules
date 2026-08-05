import { kebabCase } from "scule";
import type { Nuxt } from "@nuxt/schema";
import type { ConsolaInstance } from "consola";

export interface BaseModuleOptions {
  /** Indicates if the module is enabled */
  enabled?: boolean;
}

/**
 * Appends moduleKey as kebabCase to the Nuxt module name.
 * @param moduleKey - the config key used for module
 * @returns a namespaced module name
 *
 * @example
 * const name = resolveModuleName("myModule")
 * // Returns "@onderwijsin/nuxt-my-module"
 */
export function resolveModuleName(moduleKey: string): string {
  return `@onderwijsin/nuxt-${kebabCase(moduleKey)}`;
}

/**
 * Returns the module key in a suitable format for logger scopes
 * @param moduleKey - the config key used for module
 * @returns a kebab-cased string suitable for logger scopes
 */
export function resolveLoggerScope(moduleKey: string): string {
  return kebabCase(moduleKey);
}

/**
 * Helper to check if we are in a prepare environment in
 * the CI/CD pipeline.
 *
 * This is particularly useful for modules that need to
 * perform - or not perform - certain actions during the prepare phase.
 *
 * For example, during the prepare phase, usually not all environment
 * variables are available, so modules that depend on them should skip
 * their setup to avoid errors.
 * @param nuxt - The Nuxt Context
 * @returns boolean indicating whether prepare mode is active
 */
export function isPrepareMode(nuxt: Nuxt) {
  return !!nuxt?.options._prepare;
}

export function moduleSetup<T extends BaseModuleOptions>(
  MODULE_NAME: string,
  options: T,
  log: ConsolaInstance
) {
  /**
   * Logs the start of the module setup process.
   */
  const start = () => {
    log.start(`Loading module ${MODULE_NAME}`);
  };

  /**
   * Logs the successful completion of the module setup process.
   */
  const end = () => {
    log.success(`Module ${MODULE_NAME} Loaded`);
  };

  /**
   * Checks if the module is enabled and logs accordingly.
   * @returns boolean indicating if the module is enabled.
   */
  const isEnabled = (): boolean => {
    if ("enabled" in options && options.enabled === false) {
      log.info(`Module ${MODULE_NAME} is disabled. Skipping setup...`);
      return false;
    }
    return true;
  };

  return {
    start,
    end,
    isEnabled
  };
}
