import { z } from "zod";

/**
 * To add a special editor input:
 * 1. Define its name, supported prop type, and strict config schema with `defineSpecialInput`.
 * 2. Add the definition to the three unions below (validation, names, and macro syntax).
 * 3. Cover its shorthand or required options, inferred type, and emitted tag in the contract tests.
 */

/** String choices shown by the editor for a literal union or explicit override. */
const choices = z.array(z.string());
/** Primitive and structural categories understood by the editor endpoint. */
const propertyType = z.enum(["array", "boolean", "number", "object", "string"]);
/** Markdown insertion behavior for an editor component. */
const nodeType = z.enum(["block", "inline"]);
/** Human-readable help text shared by input, enrichment, and output. */
const description = z.string().optional();
/** An optional author or Vue prop default, retained without coercion. */
const defaultValue = z.unknown().optional();
/** Whether the editor requires a prop or nested property. */
const required = z.boolean().optional();
/** Human-readable component label supplied by the macro. */
const label = z.string();

/**
 * Derives endpoint validation and macro object syntax from one special-input definition.
 * @param definition Editor name, accepted Vue prop type, and strict options schema.
 * @returns Linked endpoint, macro, name, and shorthand schemas.
 */
function defineSpecialInput<
  const Name extends string,
  const Property extends z.infer<typeof propertyType>,
  Config extends z.ZodRawShape
>(definition: { inputType: Name; propertyType: Property; config: z.ZodObject<Config> }) {
  const { inputType, propertyType: supportedType, config } = definition;
  const nameSchema = z.literal(inputType);
  const canUseShorthand = config?.safeParse({}).success;
  // Keep the macro's TypeScript shorthand type aligned with the same empty-config rule.
  const shorthandSchema = z.custom<{} extends z.infer<typeof config> ? Name : never>(
    (value) => canUseShorthand && value === inputType
  );
  return {
    name: nameSchema,
    endpoint: z.object({
      inputType: nameSchema,
      propertyType: z.literal(supportedType),
      config: canUseShorthand ? config.optional() : config
    }),
    macro: z.strictObject({ type: nameSchema, ...config?.shape }),
    shorthand: shorthandSchema
  };
}

/** URL editor control, with optional empty configuration. */
const urlInput = defineSpecialInput({
  inputType: "url",
  propertyType: "string",
  config: z.strictObject({})
});
/** Image editor control, with optional empty configuration. */
const imageInput = defineSpecialInput({
  inputType: "image",
  propertyType: "string",
  config: z.strictObject({})
});
/** Icon editor control, requiring at least one Iconify collection. */
const iconInput = defineSpecialInput({
  inputType: "icon",
  propertyType: "string",
  config: z.strictObject({ collections: z.array(z.string().min(1)).min(1) })
});

/**
 * Special input types for one of the primitive property types, for which the
 * editor needs to render a specialized input interface.
 */
export const specialInputs = z.discriminatedUnion("inputType", [
  urlInput.endpoint,
  imageInput.endpoint,
  iconInput.endpoint
]);

/** Accepted macro input names, derived from the special-input definitions. */
export const SpecialInputNameSchema = z.union([urlInput.name, imageInput.name, iconInput.name]);

/**
 * Macro syntax for controls. Every control accepts an object form; controls without required
 * configuration also accept their name as shorthand.
 */
export const SpecialInputMacroSchema = z.union([
  urlInput.shorthand,
  imageInput.shorthand,
  iconInput.shorthand,
  z.discriminatedUnion("type", [urlInput.macro, imageInput.macro, iconInput.macro])
]);

/** Tag name used by the endpoint to identify a validated special editor input. */
export const SPECIAL_INPUT_TAG_NAME = "specialInputType";

/** Named JSDoc or editor hint transported in endpoint metadata. */
export const EditorTagSchema = z.object({
  name: z.string(),
  text: z.string().optional(),
  config: z.unknown().optional()
});
/** Optional tags attached to a component or property. */
const tags = z.array(EditorTagSchema).optional();
/** Author-supplied deprecation marker or migration guidance. */
const deprecation = z.union([z.boolean(), z.object({ text: z.string() }), z.string().min(1)]);

/** Non-recursive property overrides accepted by the authoring macro. */
const inputFields = z.strictObject({
  values: choices.optional(),
  input: SpecialInputMacroSchema.optional(),
  deprecated: deprecation.optional(),
  type: propertyType.optional(),
  description,
  default: defaultValue,
  required
});

/** Macro field shape with recursive object properties and array items. */
type RecursiveInput = z.infer<typeof inputFields> & {
  properties?: Record<string, RecursiveInput>;
  items?: RecursiveInput;
};

/** One macro prop override, recursively covering object properties and array items. */
export const EditorPropertyInputSchema: z.ZodType<RecursiveInput> = z.strictObject({
  ...inputFields.shape,
  get properties() {
    return z.record(z.string(), EditorPropertyInputSchema).optional();
  },
  get items() {
    return EditorPropertyInputSchema.optional();
  }
});

/** Complete author-written argument to `defineEditorComponentSchema`. */
export const EditorComponentInputSchema = z.strictObject({
  label,
  description,
  type: nodeType,
  deprecated: deprecation.optional(),
  props: z.record(z.string(), EditorPropertyInputSchema).optional()
});

/** Macro property fields after `input` and `deprecated` become endpoint tags. */
const enrichmentFields = z.object({
  ...inputFields.omit({ input: true, deprecated: true }).shape,
  tags
});

/** Normalized macro property shape before inference from Vue props is merged. */
type RecursiveEnrichment = z.infer<typeof enrichmentFields> & {
  properties?: Record<string, RecursiveEnrichment>;
  items?: RecursiveEnrichment;
};

/** One normalized macro prop override stored in namespaced component metadata. */
export const EditorPropertyEnrichmentSchema: z.ZodType<RecursiveEnrichment> = z.object({
  ...enrichmentFields.shape,
  get properties() {
    return z.record(z.string(), EditorPropertyEnrichmentSchema).optional();
  },
  get items() {
    return EditorPropertyEnrichmentSchema.optional();
  }
});

/** Complete namespaced macro enrichment before Vue prop inference is merged. */
export const EditorComponentEnrichmentSchema = z.object({
  ...EditorComponentInputSchema.omit({ type: true, deprecated: true, props: true }).shape,
  nodeType,
  props: z.record(z.string(), EditorPropertyEnrichmentSchema).optional(),
  tags
});

/** Partial namespaced enrichment allowed for direct `extendComponentMeta` usage. */
export const EditorComponentPartialEnrichmentSchema = EditorComponentEnrichmentSchema.partial();

/** Editor property fields after inference supplies a required name and type. */
const outputFields = z.object({
  ...enrichmentFields.omit({ type: true }).shape,
  name: z.string(),
  type: propertyType
});

/** Endpoint property shape with recursive object properties and array items. */
type RecursiveOutput = z.infer<typeof outputFields> & {
  properties?: Record<string, RecursiveOutput>;
  items?: RecursiveOutput;
};

/** One inferred and enriched prop in the component metadata response. */
export const EditorPropertyOutputSchema: z.ZodType<RecursiveOutput> = z
  .object({
    ...outputFields.shape,
    get properties() {
      return z.record(z.string(), EditorPropertyOutputSchema).optional();
    },
    get items() {
      return EditorPropertyOutputSchema.optional();
    }
  })
  .superRefine((property, context) => {
    for (const [index, tag] of (property.tags ?? []).entries()) {
      if (tag.name !== SPECIAL_INPUT_TAG_NAME) continue;
      if (!SpecialInputNameSchema.safeParse(tag.text).success) {
        context.addIssue({
          code: "custom",
          path: ["tags", index, "text"],
          message: "Unknown special input type."
        });
        continue;
      }
      if (
        specialInputs.safeParse({
          inputType: tag.text,
          propertyType: property.type,
          config: tag.config
        }).success
      ) {
        continue;
      }
      context.addIssue({
        code: "custom",
        path: ["tags", index],
        message: `Editor input ${JSON.stringify(tag.text)} has invalid options or is incompatible with property type ${JSON.stringify(property.type)}.`
      });
    }
  });

/** One component returned to the Directus editor after inference and enrichment. */
export const EditorComponentOutputSchema = z.object({
  ...EditorComponentEnrichmentSchema.omit({ props: true }).shape,
  name: z.string(),
  props: z.record(z.string(), EditorPropertyOutputSchema),
  slots: z.array(z.string())
});

/** Array payload returned by the component metadata HTTP endpoint. */
export const EditorComponentResponseSchema = z.array(EditorComponentOutputSchema);

/** Tag inferred from JSDoc or generated from an editor-specific macro field. */
export type EditorTag = z.infer<typeof EditorTagSchema>;
/** TypeScript input for one recursive macro prop override. */
export type EditorPropertyInput = z.infer<typeof EditorPropertyInputSchema>;
/** TypeScript argument accepted by `defineEditorComponentSchema`. */
export type EditorComponentInput = z.infer<typeof EditorComponentInputSchema>;
/** TypeScript shape of one normalized macro prop override. */
export type EditorPropertyEnrichment = z.infer<typeof EditorPropertyEnrichmentSchema>;
/** TypeScript shape of the normalized namespaced macro payload. */
export type EditorComponentEnrichment = z.infer<typeof EditorComponentEnrichmentSchema>;
/** TypeScript shape for partial `extendComponentMeta` enrichment. */
export type EditorComponentPartialEnrichment = z.infer<
  typeof EditorComponentPartialEnrichmentSchema
>;
/** TypeScript shape of one inferred and enriched endpoint prop. */
export type EditorPropertyOutput = z.infer<typeof EditorPropertyOutputSchema>;
/** TypeScript shape of one component in the endpoint response. */
export type EditorComponentOutput = z.infer<typeof EditorComponentOutputSchema>;
