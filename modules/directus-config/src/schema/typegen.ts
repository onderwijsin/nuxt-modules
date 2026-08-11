import { isFunction } from "@onderwijsin/nuxt-module-utils";
import { z } from "zod";

/** Metadata supplied to an advanced consumer typegen transform. */
export interface TypegenTransformContext {
  directusUrl: string;
  generatorVersion: string;
  collections: readonly string[];
  rules: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** Supported build-time typegen transform. */
export type TypegenTransform = (source: string, context: TypegenTransformContext) => string;

/**
 * Default values for the directusTypegenSchema
 */
const directusTypegenSchemaDefaults = {
  enabled: true,
  cache: { maxAge: 3_600_000 },
  augmentations: {
    removeEnums: true,
    replaceAnyWithUnknown: true,
    replaceJsonWithJSON: true,
    applyTypeNameOverrides: true,
    makeNonNullableOptionalsRequired: true,
    mergeJsDocs: true
  },
  rules: {}
} as const;

const typeExpressionSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n;]/.test(value), "must be a single TypeScript type expression");

/**
 * Zod schema for Directus type generation configuration.
 */
export const directusTypegenSchema = z
  .strictObject({
    enabled: z.boolean().default(directusTypegenSchemaDefaults.enabled),
    introspectionToken: z.string().optional(),
    cache: z
      .object({
        maxAge: z.number().int().nonnegative().default(directusTypegenSchemaDefaults.cache.maxAge)
      })
      .default(directusTypegenSchemaDefaults.cache),
    augmentations: z
      .strictObject({
        removeEnums: z.boolean().default(directusTypegenSchemaDefaults.augmentations.removeEnums),
        replaceAnyWithUnknown: z
          .boolean()
          .default(directusTypegenSchemaDefaults.augmentations.replaceAnyWithUnknown),
        replaceJsonWithJSON: z
          .boolean()
          .default(directusTypegenSchemaDefaults.augmentations.replaceJsonWithJSON),
        applyTypeNameOverrides: z
          .boolean()
          .default(directusTypegenSchemaDefaults.augmentations.applyTypeNameOverrides),
        makeNonNullableOptionalsRequired: z
          .boolean()
          .default(directusTypegenSchemaDefaults.augmentations.makeNonNullableOptionalsRequired),
        mergeJsDocs: z.boolean().default(directusTypegenSchemaDefaults.augmentations.mergeJsDocs)
      })
      .default(directusTypegenSchemaDefaults.augmentations),
    rules: z
      .record(z.string().min(1), z.record(z.string().min(1), typeExpressionSchema))
      .default({}),
    transform: z.custom<TypegenTransform>((value) => isFunction(value)).optional()
  })
  .default(directusTypegenSchemaDefaults);
