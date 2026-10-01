import {
  fromEntries,
  isArray,
  isDefined,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";

import {
  EditorComponentPartialEnrichmentSchema,
  EditorComponentResponseSchema,
  SpecialInputNameSchema,
  specialInputs
} from "../../../schema/editor-component-schema";
import type {
  EditorComponentPartialEnrichment,
  EditorComponentOutput,
  EditorPropertyEnrichment,
  EditorPropertyOutput,
  EditorTag
} from "../../../schema/editor-component-schema";

export interface EditorComponentSource {
  /** Name stored in Markdown and returned to the editor. */
  name: string;
  /** Name used to find the component in the generated Nuxt metadata registry. */
  componentName: string;
}

/**
 * Maps TypeScript's display type to the smaller set of editor input types.
 *
 * `nuxt-component-meta` retains the full TypeScript spelling (including unions and imported type
 * aliases). The Directus extension needs only the primitive editor category here; literal choices
 * are transported separately through `values`.
 * @param type TypeScript display type emitted by `nuxt-component-meta`.
 * @returns The closest Directus editor primitive type.
 */
function resolveEditorType(type: unknown): EditorPropertyOutput["type"] {
  if (!isString(type)) return "string";
  if (type.includes("[]") || type.includes("Array<")) return "array";
  if (type.includes("boolean")) return "boolean";
  if (type.includes("number")) return "number";
  return "string";
}

/**
 * Reads enum members from both the array and numeric-keyed map emitted by component meta.
 * @param schema Generated enum members.
 * @returns Members in source order.
 */
function resolveEnumMembers(schema: unknown): unknown[] {
  if (isArray(schema)) return schema;
  return isRecord(schema) ? Object.values(schema) : [];
}

/**
 * Builds the editor structure from vue-component-meta's expanded property schema.
 * @param schema Generated property schema.
 * @param custom Editor overrides for nested fields.
 * @param path Property path used in validation errors.
 * @returns The inferred object or array structure when available.
 */
function resolveStructure(
  schema: unknown,
  custom: EditorPropertyEnrichment | undefined,
  path: string
): Pick<EditorPropertyOutput, "type" | "properties" | "items"> | undefined {
  if (!isRecord(schema)) return undefined;
  if (schema.kind === "enum") {
    const members = resolveEnumMembers(schema.schema).filter((member) => member !== "undefined");
    return members.length === 1 ? resolveStructure(members[0], custom, path) : undefined;
  }
  if (schema.kind === "object" && isRecord(schema.schema)) {
    const overrides = custom?.properties;
    const properties = fromEntries(
      Object.entries(schema.schema).flatMap(([name, value]) => {
        const property = transformProperty(
          value,
          overrides?.[name],
          name,
          `${path}.properties.${name}`
        );
        return property ? [createPropertyEntry(property)] : [];
      })
    );
    return { type: "object", properties };
  }
  if (schema.kind === "array" && isArray(schema.schema) && schema.schema.length) {
    const itemSchema = schema.schema[0];
    const item = transformProperty(
      {
        name: "item",
        type: isRecord(itemSchema) ? itemSchema.type : itemSchema,
        schema: itemSchema
      },
      custom?.items,
      undefined,
      `${path}.items`
    );
    return item ? { type: "array", items: item } : { type: "array" };
  }
  return undefined;
}

/**
 * Extracts string literal choices from vue-component-meta's enum schema.
 * @param schema Generated prop schema.
 * @returns String choices when the schema is a supported literal enum.
 */
function resolveSchemaValues(schema: unknown): string[] | undefined {
  if (!isRecord(schema) || schema.kind !== "enum") return undefined;

  const values = resolveEnumMembers(schema.schema).flatMap((entry) => {
    if (isRecord(entry) && entry.kind === "literal" && isString(entry.value)) {
      return [entry.value];
    }
    if (isString(entry) && /^(['"]).*\1$/.test(entry)) return [entry.slice(1, -1)];
    return [];
  });
  return values.length ? values : undefined;
}

/**
 * Restores primitive defaults emitted as source text by the metadata parser.
 *
 * For example, Vue metadata represents a string default as `'primary'`; the editor contract needs
 * the actual value `primary`. Objects and arrays are already structured values and pass through.
 * @param value Generated default value.
 * @returns A restored primitive or the original structured value.
 */
function resolveDefault(value: unknown): unknown {
  if (!isString(value)) return value;
  if (value === "true") return true;
  if (value === "false") return false;

  const numeric = Number(value);
  if (value.trim() !== "" && Number.isFinite(numeric)) return numeric;
  return value.replace(/^['"]|['"]$/g, "");
}

/**
 * Normalizes both inferred JSDoc tags and explicitly declared editor tags.
 * @param value Generated or custom tags payload.
 * @returns Valid editor tags when present.
 */
function resolveTags(value: unknown): EditorTag[] | undefined {
  if (!isArray(value)) return undefined;

  const tags = value.flatMap((tag) => {
    if (!isRecord(tag) || !isString(tag.name)) return [];
    return [
      {
        name: tag.name,
        ...(isString(tag.text) ? { text: tag.text } : {}),
        ...(isDefined(tag.config) ? { config: tag.config } : {})
      }
    ];
  });
  return tags.length ? tags : undefined;
}

/**
 * Transforms one inferred Vue prop and layers author-supplied editor metadata over it.
 *
 * Inference remains the default source for descriptions, required/default state, literal unions,
 * and JSDoc tags. The namespaced `markdownRenderer.props.<prop>` object exists for information that
 * TypeScript cannot reliably express for an editor, such as imported union values or a preferred
 * editor category for a complex prop.
 * @param value Inferred prop metadata.
 * @param custom Namespaced editor override for the prop.
 * @param fallbackName Property name supplied by an object schema key.
 * @param path Property path used in validation errors.
 * @returns The normalized editor prop, or nothing for malformed inferred metadata.
 */
function transformProperty(
  value: unknown,
  custom: EditorPropertyEnrichment | undefined,
  fallbackName?: string,
  path?: string
): EditorPropertyOutput | undefined {
  if (!isRecord(value)) return undefined;
  const name = isString(value.name) ? value.name : fallbackName;
  if (!name) return undefined;

  const description = custom?.description ?? value.description;
  const values = custom?.values ?? resolveSchemaValues(value.schema);
  const inferredType = resolveEditorType(value.type);
  const propertyPath = path ?? name;
  const structure = resolveStructure(value.schema, custom, propertyPath);
  const sourceType = structure?.type ?? inferredType;
  for (const tag of custom?.tags ?? []) {
    if (tag.name !== "editor" || !SpecialInputNameSchema.safeParse(tag.text).success) continue;
    if (
      specialInputs.safeParse({ inputType: tag.text, propertyType: sourceType, config: tag.config })
        .success
    )
      continue;
    throw new Error(
      `Invalid editor input ${JSON.stringify(tag.text)} for ${propertyPath}: inferred property type is ${JSON.stringify(sourceType)}.`
    );
  }
  const type =
    custom?.type ??
    structure?.type ??
    (values && inferredType !== "array" ? "string" : inferredType);
  const tags = custom?.tags ?? resolveTags(value.tags);
  const customDefault = custom?.default;
  const defaultValue = isDefined(customDefault) ? customDefault : value.default;
  const required =
    custom?.required === true || (custom?.required !== false && value.required === true);

  return {
    name,
    type,
    ...(structure?.properties ? { properties: structure.properties } : {}),
    ...(structure?.items ? { items: structure.items } : {}),
    ...(isString(description) && description ? { description } : {}),
    ...(required ? { required: true } : {}),
    ...(isDefined(defaultValue) ? { default: resolveDefault(defaultValue) } : {}),
    ...(values ? { values } : {}),
    ...(tags ? { tags } : {})
  };
}

function createPropertyEntry(property: EditorPropertyOutput): [string, EditorPropertyOutput] {
  return [property.name, property];
}

/**
 * Reads the namespaced payload produced by the `defineEditorComponentSchema` compiler macro.
 * @param meta Generated component metadata.
 * @returns The renderer-specific custom metadata object.
 */
function resolveCustomComponentMetadata(
  meta: Record<string, unknown>
): EditorComponentPartialEnrichment | undefined {
  const parsed = EditorComponentPartialEnrichmentSchema.safeParse(meta.markdownRenderer);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Converts Nuxt component metadata to the Directus Markdown editor contract.
 *
 * The registry is an external/generated boundary, so every value is narrowed before use. Reserved
 * `Reference` nodes are omitted because Directus owns that editor node. Components without parsed
 * metadata are also omitted rather than returning an incomplete contract.
 *
 * The result is a bare array. The Directus extension accepts either this shape or a legacy
 * `{ components: [...] }` wrapper and normalizes both; the array avoids an unnecessary envelope.
 *
 * @param registry Component registry generated by `nuxt-component-meta`.
 * @param components Renderer node names and their Nuxt component names.
 * @returns Directus Markdown editor component metadata.
 */
export function createEditorComponentMetadata(
  registry: unknown,
  components: EditorComponentSource[]
): EditorComponentOutput[] {
  if (!isRecord(registry)) return [];

  const output = components.flatMap(({ name, componentName }) => {
    if (name === "Reference") return [];

    const component = registry[componentName];
    if (!isRecord(component) || !isRecord(component.meta)) return [];

    const custom = resolveCustomComponentMetadata(component.meta);
    const customProps = custom?.props;
    const props = isArray(component.meta.props)
      ? component.meta.props.flatMap((value) => {
          const propertyName = isRecord(value) && isString(value.name) ? value.name : undefined;
          const property = transformProperty(
            value,
            propertyName ? customProps?.[propertyName] : undefined,
            undefined,
            `${name}.props.${propertyName ?? "unknown"}`
          );
          return property ? [createPropertyEntry(property)] : [];
        })
      : [];
    const slots = isArray(component.meta.slots)
      ? component.meta.slots.flatMap((slot) =>
          isRecord(slot) && isString(slot.name) ? [slot.name] : []
        )
      : [];
    const label = custom?.label ?? name;
    const nodeType = custom?.nodeType ? custom.nodeType : slots.length ? "block" : "inline";
    const description = custom?.description ?? component.meta.description;
    const tags = custom?.tags ?? resolveTags(component.meta.tags);

    return [
      {
        name,
        label,
        ...(isString(description) && description ? { description } : {}),
        nodeType,
        props: fromEntries(props),
        slots,
        ...(tags ? { tags } : {})
      } satisfies EditorComponentOutput
    ];
  });
  const parsed = EditorComponentResponseSchema.safeParse(output);
  if (!parsed.success) {
    throw new Error(
      `Invalid Markdown editor component metadata:\n${z.prettifyError(parsed.error)}`
    );
  }
  return parsed.data;
}
