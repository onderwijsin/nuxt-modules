import { fromEntries, isRecord, isString, toEntries } from "@onderwijsin/nuxt-module-utils/shared";
import { useLogger } from "@nuxt/kit";
import { z } from "zod";

import {
  EditorComponentEnrichmentSchema,
  EditorComponentInputSchema,
  SPECIAL_INPUT_TAG_NAME
} from "../schema/editor-component-schema";
import type {
  EditorPropertyEnrichment,
  EditorPropertyInput,
  EditorTag
} from "../schema/editor-component-schema";

/**
 * Converts macro deprecation guidance into the endpoint's standard tag.
 * @param value Author-supplied deprecation marker or guidance.
 * @returns Deprecated tag when the property is deprecated.
 */
function resolveDeprecatedTag(value: EditorPropertyInput["deprecated"]): EditorTag | undefined {
  if (value === true) return { name: "deprecated" };
  if (!value) return undefined;
  return { name: "deprecated", text: isString(value) ? value : value.text };
}

/**
 * Converts a shorthand or configured control into its endpoint special-input tag.
 * @param input Macro control declaration.
 * @returns Special-input tag with any control-specific configuration.
 */
function resolveEditorTag(input: EditorPropertyInput["input"]): EditorTag | undefined {
  if (!input) return undefined;
  if (isString(input)) return { name: SPECIAL_INPUT_TAG_NAME, text: input };
  const { type, ...config } = input;
  return {
    name: SPECIAL_INPUT_TAG_NAME,
    text: type,
    ...(Object.keys(config).length ? { config } : {})
  };
}

/**
 * Converts one recursive macro property override to namespaced enrichment.
 * @param value Validated macro property override.
 * @returns Enrichment with editor and deprecation tags.
 */
function transformProperty(value: EditorPropertyInput): EditorPropertyEnrichment {
  const { deprecated, input, properties, items, ...metadata } = value;
  const deprecatedTag = resolveDeprecatedTag(deprecated);
  const editorTag = resolveEditorTag(input);
  const tags = [...(editorTag ? [editorTag] : []), ...(deprecatedTag ? [deprecatedTag] : [])];

  return {
    ...metadata,
    ...(properties
      ? {
          properties: fromEntries(
            toEntries(properties).map(([name, prop]) => [name, transformProperty(prop)])
          )
        }
      : {}),
    ...(items ? { items: transformProperty(items) } : {}),
    ...(tags.length ? { tags } : {})
  };
}

/**
 * Converts the concise renderer macro payload to the namespaced metadata consumed by the endpoint.
 *
 * `nuxt-component-meta` runs this transform while extracting the compiler macro. The public
 * `type`, `input`, and `deprecated` conveniences become the stable Directus metadata contract, so
 * the authoring API does not expose its `markdownRenderer` namespace or low-level tag structure.
 * @param extracted Statically extracted argument passed to `defineEditorComponentSchema`.
 * @returns Namespaced metadata understood by the Markdown renderer metadata endpoint.
 */
export function transformMarkdownComponentMeta(
  extracted: Record<string, unknown> | unknown[]
): Record<string, unknown> {
  const parsed = EditorComponentInputSchema.safeParse(extracted);
  if (!parsed.success) {
    const label =
      isRecord(extracted) && isString(extracted.label) ? ` ${JSON.stringify(extracted.label)}` : "";
    useLogger("markdownRenderer").warn(
      `Invalid defineEditorComponentSchema metadata${label}:\n${z.prettifyError(parsed.error)}`
    );
    return { markdownRenderer: {} };
  }

  const { deprecated, props, type, ...metadata } = parsed.data;
  const deprecatedTag = resolveDeprecatedTag(deprecated);
  const transformedProps = props
    ? fromEntries(toEntries(props).map(([name, value]) => [name, transformProperty(value)]))
    : undefined;

  return {
    markdownRenderer: EditorComponentEnrichmentSchema.parse({
      ...metadata,
      nodeType: type,
      ...(transformedProps ? { props: transformedProps } : {}),
      ...(deprecatedTag ? { tags: [deprecatedTag] } : {})
    })
  };
}
