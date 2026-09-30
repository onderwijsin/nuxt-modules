/**
 * Generates the component-set metadata endpoint handler.
 * @param runtimeMetadataPath Published metadata transformation utility.
 * @param componentNames All discovered renderer component names.
 * @param componentSets Named component allowlists.
 * @returns Generated Nitro handler source.
 */
export function generateMetadataHandler(
  runtimeMetadataPath: string,
  componentNames: string[],
  componentSets: Record<string, string[]>
): string {
  return [
    'import componentMeta from "#nuxt-component-meta/nitro";',
    'import { createError, defineEventHandler, getRouterParam } from "h3";',
    `import { createEditorComponentMetadata } from ${JSON.stringify(runtimeMetadataPath)};`,
    `const rendererComponentNames = ${JSON.stringify(componentNames)};`,
    `const componentSets = ${JSON.stringify(componentSets)};`,
    "export default defineEventHandler((event) => {",
    '  const componentSet = getRouterParam(event, "componentSet");',
    "  const componentNames = componentSet ? componentSets[componentSet] : rendererComponentNames;",
    "  if (!componentNames) throw createError({ statusCode: 404, statusMessage: `Unknown Markdown renderer component set: ${componentSet}` });",
    "  return createEditorComponentMetadata(componentMeta, componentNames);",
    "});"
  ].join("\n");
}
