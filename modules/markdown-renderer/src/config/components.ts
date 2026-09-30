import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

export interface RendererComponent {
  name: string;
  filePath: string;
}

const VUE_EXTENSION = ".vue";

/**
 * Discovers direct Vue component children in a renderer directory.
 * @param directory Absolute renderer component directory.
 * @returns Renderer components sorted by name.
 */
export function discoverRendererComponents(directory: string): RendererComponent[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === VUE_EXTENSION)
    .map((entry) => ({
      name: basename(entry.name, VUE_EXTENSION),
      filePath: join(directory, entry.name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Merges built-in and consumer components while giving consumers collision precedence.
 * @param builtIns Module-provided renderer components.
 * @param consumers Application-provided renderer components.
 * @returns The merged renderer component list.
 */
export function mergeRendererComponents(
  builtIns: RendererComponent[],
  consumers: RendererComponent[]
): RendererComponent[] {
  const components = new Map(builtIns.map((component) => [component.name, component]));
  for (const component of consumers) components.set(component.name, component);
  return [...components.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Generates a lazy component registry consumed by the runtime renderer.
 * @param components Renderer components to expose.
 * @param componentSets Named component allowlists.
 * @returns Generated module source.
 */
export function generateRendererManifest(
  components: RendererComponent[],
  componentSets: Record<string, string[]>
): string {
  const loaders = components
    .map(
      ({ name, filePath }) => `  ${JSON.stringify(name)}: () => import(${JSON.stringify(filePath)})`
    )
    .join(",\n");

  return [
    `const componentLoaders = {\n${loaders}\n};`,
    `const componentSets = ${JSON.stringify(componentSets)};`,
    "export function resolveRendererComponent(name, componentSet) {",
    "  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1);",
    "  const allowedComponents = componentSet ? componentSets[componentSet] : undefined;",
    "  if (componentSet && (!allowedComponents || !allowedComponents.includes(normalizedName))) return null;",
    "  return componentLoaders[normalizedName]?.() ?? null;",
    "}",
    `export const rendererComponentNames = ${JSON.stringify(components.map(({ name }) => name))};`,
    "export { componentSets };"
  ].join("\n");
}

/**
 * Generates the optional consumer reference resolver bridge.
 * @param resolverPath Optional application resolver import path.
 * @returns Generated module source.
 */
export function generateReferenceResolver(resolverPath?: string): string {
  if (!resolverPath) {
    return "export default function resolveReferencePath(_collection: string, _item: string, _label?: string, _text?: string, _data?: Record<string, unknown>): string | undefined { return undefined; }";
  }
  return `export { default } from ${JSON.stringify(resolverPath)};`;
}
