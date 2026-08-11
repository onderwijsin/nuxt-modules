/**
 * @fileoverview
 *
 * Directus configuration is executable and may contain credentials, while
 * `#directus-config` is importable by client application code. Schemas mark every
 * non-public field with `.sensitive()` at its declaration. `getPublicSchema()`
 * then derives the client-safe projection from those annotations, preventing an
 * independently maintained sanitizer from drifting when the config evolves.
 */

import { z } from "zod";

/** Runtime marker carried by schemas marked with `.sensitive()`. */
const sensitiveSchema = Symbol("sensitive-schema");

/** Schema whose value is omitted from a public configuration projection. */
export type SensitiveSchema<Schema extends z.core.SomeType> = Schema & {
  readonly __sensitiveSchema: true;
};

type IsSensitiveSchema<Schema extends z.core.SomeType> =
  Schema extends SensitiveSchema<Schema>
    ? true
    : Schema extends z.ZodDefault<infer Inner>
      ? IsSensitiveSchema<Inner>
      : Schema extends z.ZodNullable<infer Inner>
        ? IsSensitiveSchema<Inner>
        : Schema extends z.ZodOptional<infer Inner>
          ? IsSensitiveSchema<Inner>
          : false;

type PublicKeys<Shape extends z.core.$ZodShape> = {
  [Key in keyof Shape]: IsSensitiveSchema<Shape[Key]> extends true ? never : Key;
}[keyof Shape];

type OptionalPublicKeys<Shape extends z.core.$ZodShape> = {
  [Key in PublicKeys<Shape>]: Shape[Key] extends z.ZodOptional<z.core.SomeType> ? Key : never;
}[PublicKeys<Shape>];

type RequiredPublicKeys<Shape extends z.core.$ZodShape> = Exclude<
  PublicKeys<Shape>,
  OptionalPublicKeys<Shape>
>;

type PublicObjectOutput<Shape extends z.core.$ZodShape> = {
  [Key in RequiredPublicKeys<Shape>]: PublicSchemaOutput<Shape[Key]>;
} & {
  [Key in OptionalPublicKeys<Shape>]?: Exclude<PublicSchemaOutput<Shape[Key]>, undefined>;
};

/** Output produced after omitting fields marked as sensitive. */
export type PublicSchemaOutput<Schema extends z.core.SomeType> =
  IsSensitiveSchema<Schema> extends true
    ? never
    : Schema extends z.ZodDefault<infer Inner>
      ? PublicSchemaOutput<Inner>
      : Schema extends z.ZodNullable<infer Inner>
        ? PublicSchemaOutput<Inner> | null
        : Schema extends z.ZodOptional<infer Inner>
          ? PublicSchemaOutput<Inner> | undefined
          : Schema extends z.ZodObject<infer Shape>
            ? PublicObjectOutput<Shape>
            : z.output<Schema>;

declare module "zod" {
  interface GlobalMeta {
    sensitive?: boolean;
  }

  interface ZodType<
    out Output = unknown,
    out Input = unknown,
    out Internals extends z.core.$ZodTypeInternals<Output, Input> = z.core.$ZodTypeInternals<
      Output,
      Input
    >
  > {
    /** Marks this schema as omitted from public configuration. */
    sensitive(): SensitiveSchema<this>;
  }
}

/**
 * Adds public-projection metadata and a type-level sensitivity marker to a schema.
 *
 * @returns The annotated schema.
 */
z.ZodType.prototype.sensitive = function sensitive() {
  const schema = this.meta({ ...this.meta(), sensitive: true });
  Reflect.defineProperty(schema, sensitiveSchema, { value: true });
  return schema;
};

const omitted = Symbol("omitted");

/**
 * Returns whether a schema, including its wrappers, is marked as sensitive.
 *
 * @param schema Schema to inspect.
 * @returns Whether the schema is sensitive.
 */
function isSensitive(schema: z.core.$ZodType): boolean {
  if (schema instanceof z.ZodType && schema.meta()?.sensitive) return true;
  if (
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable
  ) {
    return isSensitive(schema.unwrap());
  }
  return false;
}

/**
 * Recursively removes sensitive values from validated configuration data.
 *
 * @param schema Schema that owns sensitivity annotations.
 * @param value Validated value to project.
 * @returns Public value or an internal omission sentinel.
 */
function getPublicValue(schema: z.core.$ZodType, value: unknown): unknown | typeof omitted {
  if (isSensitive(schema)) return omitted;

  if (schema instanceof z.ZodDefault || schema instanceof z.ZodOptional) {
    return getPublicValue(schema.unwrap(), value);
  }

  if (!(schema instanceof z.ZodObject) || !value || typeof value !== "object") return value;

  const publicValue: Record<string, unknown> = {};
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const fieldValue = getPublicValue(fieldSchema, Reflect.get(value, key));
    if (fieldValue !== omitted) publicValue[key] = fieldValue;
  }
  return Object.keys(publicValue).length > 0 ? publicValue : omitted;
}

/**
 * Derives a client-safe projection from schema fields marked with `.sensitive()`.
 *
 * @param schema Complete schema that owns the sensitivity annotations.
 * @returns A schema that validates and removes sensitive fields.
 */
export function getPublicSchema<Schema extends z.ZodObject>(schema: Schema) {
  return schema
    .strip()
    .transform<PublicSchemaOutput<Schema>>((value) =>
      z.custom<PublicSchemaOutput<Schema>>().parse(getPublicValue(schema, value))
    );
}
