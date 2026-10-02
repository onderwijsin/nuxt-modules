import { basename, dirname, extname, resolve } from "pathe";

export interface RendererComponent {
  /** Name stored in Markdown and exposed to the renderer. */
  name: string;
  /** Name registered by Nuxt and exposed by `nuxt-component-meta`. */
  componentName: string;
  filePath: string;
}

interface ResolvedNuxtComponent {
  pascalName: string;
  filePath: string;
}

/**
 * Resolves the persisted Markdown node name for a discovered Vue component.
 *
 * Reference nodes predate the `Markdown` component prefix and are already stored as `:Reference`
 * in Directus. Keeping that public name here lets the Vue implementation use the unambiguous
 * `MarkdownReference` name without migrating persisted content.
 * Nuxt's default component scan may prefix a file in `components/renderer/` as `RendererFoo` even
 * when this module also registers that directory without a path prefix. The filename is the module's
 * stable public contract; `componentName` remains available separately for metadata lookup.
 * @param filePath Component source path registered by Nuxt.
 * @returns The public Markdown node name.
 */
function resolveRendererNodeName(filePath: string): string {
  const fileName = basename(filePath, extname(filePath));
  return fileName === "MarkdownReference" ? "Reference" : fileName;
}

/**
 * Selects direct renderer children from Nuxt's resolved component registry.
 *
 * Nuxt owns component scanning, extension handling, layers, and priority resolution. Filtering its
 * registry keeps this module aligned with that behavior instead of maintaining a second file-system
 * scanner. Nested files are deliberately excluded by the initial renderer contract.
 * @param components Components resolved by Nuxt's `components:extend` hook.
 * @param directories Absolute renderer directories owned by this module and the consumer.
 * @returns Renderer components sorted by name.
 */
export function selectRendererComponents(
  components: ResolvedNuxtComponent[],
  directories: string[]
): RendererComponent[] {
  const rendererDirectories = new Set(directories.map((directory) => resolve(directory)));
  return components
    .filter((component) => rendererDirectories.has(resolve(dirname(component.filePath))))
    .map((component) => ({
      name: resolveRendererNodeName(component.filePath),
      componentName: component.pascalName,
      filePath: component.filePath
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

  return `import { createRendererManifest } from "#markdown-renderer/manifest-factory";

const componentLoaders = {
${loaders}
};

export const { componentSets, rendererComponentNames, resolveRendererComponent } =
  createRendererManifest(componentLoaders, ${JSON.stringify(componentSets)});
`;
}
