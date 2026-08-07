import { kebabCase } from "scule";
import type { Nuxt } from "@nuxt/schema";
import type { ConsolaInstance } from "consola";
import { z } from "zod";

export interface BaseModuleOptions {
  /** Indicates if the module is enabled */
  enabled?: boolean;
}

/**
 * Resolves a config key to a namespaced Nuxt module name.
 * @param moduleKey - The module config key.
 * @returns The namespaced module name.
 */
export function resolveModuleName(moduleKey: string): string {
  return `@onderwijsin/nuxt-${kebabCase(moduleKey)}`;
}

/**
 * Resolves a module key to a logger scope.
 * @param moduleKey - The module config key.
 * @returns The logger scope.
 */
export function resolveLoggerScope(moduleKey: string): string {
  return kebabCase(moduleKey);
}

/**
 * Returns whether Nuxt is preparing the project.
 * @param nuxt - The Nuxt context.
 * @returns Whether prepare mode is active.
 */
export function isPrepareMode(nuxt: Nuxt): boolean {
  return !!nuxt?.options._prepare;
}

/**
 * Adds a module's runtime directory to Nuxt's transpilation list.
 * @param nuxt - The Nuxt context being configured.
 * @param runtimeDir - Absolute path to the module runtime directory.
 */
export function transpileRuntime(nuxt: Nuxt, runtimeDir: string): void {
  nuxt.options.build.transpile.push(runtimeDir);
}

/**
 * Creates shared lifecycle helpers for a Nuxt module.
 * @param MODULE_NAME - The module name.
 * @param options - The module options.
 * @param log - The module logger.
 * @returns Module lifecycle helpers.
 */
export function moduleSetup<T extends BaseModuleOptions>(
  MODULE_NAME: string,
  options: T,
  log: ConsolaInstance
) {
  const start = () => log.start(`Loading module ${MODULE_NAME}`);
  const end = () => log.success(`Module ${MODULE_NAME} Loaded`);
  const isEnabled = (): boolean => {
    if ("enabled" in options && options.enabled === false) {
      log.info(`Module ${MODULE_NAME} is disabled. Skipping setup...`);
      return false;
    }
    return true;
  };

  return { start, end, isEnabled };
}

/**
 * Validates module options against a Zod schema.
 * @param options - The module options.
 * @param schema - The module-specific Zod shape.
 * @param log - The module logger.
 * @returns The validated options.
 * @throws When validation fails.
 */
export function validateModuleOptions<T extends BaseModuleOptions, S extends z.ZodRawShape>(
  options: T,
  schema: S,
  log: ConsolaInstance
): z.infer<z.ZodObject<{ enabled: z.ZodDefault<z.ZodBoolean> } & S>> {
  const mergedSchema = z.looseObject({ enabled: z.boolean().default(true) }).extend(schema);
  const result = mergedSchema.safeParse(options);

  if (result.success) {
    return result.data as z.infer<z.ZodObject<{ enabled: z.ZodDefault<z.ZodBoolean> } & S>>;
  }

  log.info(z.prettifyError(result.error));
  throw new Error("Invalid module options ☝. Exiting.");
}
