import { fromEntries, isRecord, isString, toEntries } from "@onderwijsin/nuxt-module-utils/shared";

interface MetadataTag {
  name: string;
  text?: string;
}

function resolveDeprecatedTag(value: unknown): MetadataTag | undefined {
  if (value === true) return { name: "deprecated" };
  if (!isRecord(value) || !isString(value.text)) return undefined;
  return { name: "deprecated", text: value.text };
}

function transformProperty(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const { deprecated, input, ...metadata } = value;
  const deprecatedTag = resolveDeprecatedTag(deprecated);
  const tags = [
    ...(input === "image" || input === "url" ? [{ name: "editor", text: input }] : []),
    ...(deprecatedTag ? [deprecatedTag] : [])
  ];

  return {
    ...metadata,
    ...(tags.length ? { tags } : {})
  };
}

/**
 * Converts the concise renderer macro payload to the namespaced metadata consumed by the endpoint.
 *
 * `nuxt-component-meta` runs this transform while extracting the compiler macro. The public
 * `type`, `input`, and `deprecated` conveniences become the stable Directus metadata contract, so
 * the authoring API does not expose its `markdownRenderer` namespace or low-level tag structure.
 * @param extracted Statically extracted argument passed to `extendMarkdownComponent`.
 * @returns Namespaced metadata understood by the Markdown renderer metadata endpoint.
 */
export function transformMarkdownComponentMeta(
  extracted: Record<string, unknown> | unknown[]
): Record<string, unknown> {
  if (!isRecord(extracted)) return { markdownRenderer: {} };

  const { deprecated, props, type, ...metadata } = extracted;
  const deprecatedTag = resolveDeprecatedTag(deprecated);
  const transformedProps = isRecord(props)
    ? fromEntries(toEntries(props).map(([name, value]) => [name, transformProperty(value)]))
    : undefined;

  return {
    markdownRenderer: {
      ...metadata,
      ...(type === "block" || type === "inline" ? { nodeType: type } : {}),
      ...(transformedProps ? { props: transformedProps } : {}),
      ...(deprecatedTag ? { tags: [deprecatedTag] } : {})
    }
  };
}
