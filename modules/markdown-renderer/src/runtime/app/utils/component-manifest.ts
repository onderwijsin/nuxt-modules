type ComponentLoader = () => Promise<unknown>;

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
      const normalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      const allowedComponents = componentSet ? componentSets[componentSet] : undefined;

      if (componentSet && (!allowedComponents || !allowedComponents.includes(normalizedName))) {
        return null;
      }

      return componentLoaders[normalizedName]?.() ?? null;
    }
  };
}
