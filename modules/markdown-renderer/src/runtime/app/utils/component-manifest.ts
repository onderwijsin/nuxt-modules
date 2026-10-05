type ComponentLoader = () => Promise<unknown>;

/**
 * Converts Comark's kebab-case node names to the PascalCase names used by Nuxt's component registry.
 * @param name Component name emitted by Comark.
 * @returns The matching renderer component name.
 */
function resolveComponentName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Creates the runtime resolver around build-time generated lazy component imports.
 * @param componentLoaders Lazy imports keyed by renderer component name.
 * @param componentSets Configured component allowlists.
 * @returns Runtime manifest values consumed by `MarkdownRenderer` and metadata generation.
 */
export function createRendererManifest(
  componentLoaders: Record<string, ComponentLoader>,
  componentSets: Record<string, string[]>
) {
  return {
    componentSets,
    rendererComponentNames: Object.keys(componentLoaders),
    resolveRendererComponent(name: string, componentSet?: string) {
      const normalizedName = resolveComponentName(name);
      const allowedComponents = componentSet ? componentSets[componentSet] : undefined;

      if (
        normalizedName !== "Reference" &&
        componentSet &&
        (!allowedComponents || !allowedComponents.includes(normalizedName))
      ) {
        return null;
      }

      return componentLoaders[normalizedName]?.() ?? null;
    }
  };
}
