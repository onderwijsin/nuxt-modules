import {
  fromEntries,
  isArray,
  isDefined,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";

interface EditorTag {
  name: string;
  text?: string;
}

interface EditorPropertyMetadata {
  name: string;
  type: "array" | "boolean" | "number" | "string";
  description?: string;
  required?: boolean;
  default?: unknown;
  values?: string[];
  tags?: EditorTag[];
}

export interface EditorComponentMetadata {
  name: string;
  label: string;
  description?: string;
  nodeType: "block" | "inline";
  props: Record<string, EditorPropertyMetadata>;
  slots: string[];
  tags?: EditorTag[];
}

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
function resolveEditorType(type: unknown): EditorPropertyMetadata["type"] {
  if (!isString(type)) return "string";
  if (type.includes("[]") || type.includes("Array<")) return "array";
  if (type.includes("boolean")) return "boolean";
  if (type.includes("number")) return "number";
  return "string";
}

/**
 * Extracts string literal choices from vue-component-meta's enum schema.
 * @param schema Generated prop schema.
 * @returns String choices when the schema is a supported literal enum.
 */
function resolveSchemaValues(schema: unknown): string[] | undefined {
  if (!isRecord(schema) || schema.kind !== "enum" || !isArray(schema.schema)) return undefined;

  const values = schema.schema.flatMap((entry) =>
    isRecord(entry) && entry.kind === "literal" && isString(entry.value) ? [entry.value] : []
  );
  return values.length ? values : undefined;
}

/**
 * Reads explicit editor choices declared through `extendMarkdownComponent`.
 * @param value Custom values payload.
 * @returns The non-empty string choices, when valid.
 */
function resolveCustomValues(value: unknown): string[] | undefined {
  if (!isArray(value)) return undefined;
  const values = value.filter(isString);
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
    return [{ name: tag.name, ...(isString(tag.text) ? { text: tag.text } : {}) }];
  });
  return tags.length ? tags : undefined;
}

/**
 * Returns a supported explicit editor type, leaving inference in charge for invalid values.
 * @param value Custom type override.
 * @returns The supported override when valid.
 */
function resolveCustomType(value: unknown): EditorPropertyMetadata["type"] | undefined {
  return value === "array" || value === "boolean" || value === "number" || value === "string"
    ? value
    : undefined;
}

/**
 * Transforms one inferred Vue prop and layers author-supplied editor metadata over it.
 *
 * Inference remains the default source for descriptions, required/default state, literal unions,
 * and JSDoc tags. The namespaced `markdownRenderer.props.<prop>` object exists for information that
 * TypeScript cannot reliably express for an editor, such as imported union values or a preferred
 * editor category for a complex prop.
 * @param value Inferred prop metadata.
 * @param customValue Namespaced editor override for the prop.
 * @returns The normalized editor prop, or nothing for malformed inferred metadata.
 */
function transformProperty(
  value: unknown,
  customValue: unknown
): EditorPropertyMetadata | undefined {
  if (!isRecord(value) || !isString(value.name)) return undefined;

  const custom = isRecord(customValue) ? customValue : {};
  const description = isString(custom.description) ? custom.description : value.description;
  const values = resolveCustomValues(custom.values) ?? resolveSchemaValues(value.schema);
  const inferredType = resolveEditorType(value.type);
  const type =
    resolveCustomType(custom.type) ??
    (values && inferredType !== "array" ? "string" : inferredType);
  const tags = resolveTags(custom.tags) ?? resolveTags(value.tags);
  const defaultValue = isDefined(custom.default) ? custom.default : value.default;
  const required =
    custom.required === true || (custom.required !== false && value.required === true);

  return {
    name: value.name,
    type,
    ...(isString(description) && description ? { description } : {}),
    ...(required ? { required: true } : {}),
    ...(isDefined(defaultValue) ? { default: resolveDefault(defaultValue) } : {}),
    ...(values ? { values } : {}),
    ...(tags ? { tags } : {})
  };
}

function createPropertyEntry(property: EditorPropertyMetadata): [string, EditorPropertyMetadata] {
  return [property.name, property];
}

/**
 * Reads the namespaced payload produced by the `extendMarkdownComponent` compiler macro.
 * @param meta Generated component metadata.
 * @returns The renderer-specific custom metadata object.
 */
function resolveCustomComponentMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  return isRecord(meta.markdownRenderer) ? meta.markdownRenderer : {};
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
): EditorComponentMetadata[] {
  if (!isRecord(registry)) return [];

  return components.flatMap(({ name, componentName }) => {
    if (name === "Reference") return [];

    const component = registry[componentName];
    if (!isRecord(component) || !isRecord(component.meta)) return [];

    const custom = resolveCustomComponentMetadata(component.meta);
    const customProps = isRecord(custom.props) ? custom.props : {};
    const props = isArray(component.meta.props)
      ? component.meta.props.flatMap((value) => {
          const propertyName = isRecord(value) && isString(value.name) ? value.name : undefined;
          const property = transformProperty(
            value,
            propertyName ? customProps[propertyName] : undefined
          );
          return property ? [createPropertyEntry(property)] : [];
        })
      : [];
    const slots = isArray(component.meta.slots)
      ? component.meta.slots.flatMap((slot) =>
          isRecord(slot) && isString(slot.name) ? [slot.name] : []
        )
      : [];
    const label = isString(custom.label) ? custom.label : name;
    const nodeType =
      custom.nodeType === "block" || custom.nodeType === "inline"
        ? custom.nodeType
        : slots.length
          ? "block"
          : "inline";
    const description = isString(custom.description)
      ? custom.description
      : component.meta.description;
    const tags = resolveTags(custom.tags) ?? resolveTags(component.meta.tags);

    return [
      {
        name,
        label,
        ...(isString(description) && description ? { description } : {}),
        nodeType,
        props: fromEntries(props),
        slots,
        ...(tags ? { tags } : {})
      } satisfies EditorComponentMetadata
    ];
  });
}
