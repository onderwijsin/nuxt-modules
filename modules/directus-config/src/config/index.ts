import { directusConfigSchema } from "../schema";
import type { DirectusConfig, ResolvedDirectusConfig } from "../schema";

export type { DirectusConfig, ResolvedDirectusConfig } from "../schema";

// type NoUnknownKeys<Value, Shape> = Value & Record<Exclude<keyof Value, keyof Shape>, never>;

/**
 * Defines strictly typed shared Directus configuration.
 *
 * @param config Directus configuration object.
 * @returns The unchanged typed configuration.
 */
export function defineDirectusConfig(config: DirectusConfig): DirectusConfig {
  return config;
}

/**
 * Validates shared Directus configuration when the generated source module is imported.
 *
 * @param config Consumer-owned configuration.
 * @returns Validated shared configuration.
 * @throws When the source has an invalid public configuration shape.
 */
export function validateDirectusConfig(config: unknown): ResolvedDirectusConfig {
  const result = directusConfigSchema.safeParse(config);
  if (!result.success) throw new TypeError("Invalid directus.config.ts configuration.");
  return result.data;
}
