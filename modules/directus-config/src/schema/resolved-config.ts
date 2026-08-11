import type { Nuxt } from "@nuxt/schema";

import { directusConfigSchema } from "./index";

/**
 * Stores validated shared Directus config for downstream Nuxt module setup.
 *
 * @param nuxt Active Nuxt instance.
 * @param config Validated Directus configuration.
 */
export function setResolvedDirectusConfig(
  nuxt: Nuxt,
  config: ReturnType<typeof directusConfigSchema.parse>
): void {
  Reflect.defineProperty(nuxt.options, "_directus", { configurable: true, value: config });
}

/**
 * Reads shared Directus config resolved by the optional directus-config module.
 *
 * @param nuxt Active Nuxt instance.
 * @returns Validated shared Directus configuration, when available.
 */
export function getResolvedDirectusConfig(nuxt: Nuxt) {
  const result = directusConfigSchema.safeParse(Reflect.get(nuxt.options, "_directus"));
  return result.success ? result.data : undefined;
}
