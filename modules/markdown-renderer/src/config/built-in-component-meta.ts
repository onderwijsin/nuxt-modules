import { existsSync } from "node:fs";

import { basename, dirname, resolve } from "pathe";
import type { ComponentMetaParserOptions } from "nuxt-component-meta";

/**
 * Parses the typed source of each built-in component for editor metadata.
 * Runtime registration continues to use the compiled Vue component.
 * @param options Component-meta parser options for this Nuxt application.
 * @param builtInDirectory Directory containing compiled built-in renderer components.
 * @param metadataSourceDirectory Packaged directory containing their typed Vue sources.
 */
export function useBuiltInComponentSources(
  options: ComponentMetaParserOptions,
  builtInDirectory: string,
  metadataSourceDirectory: string
): void {
  options.components = options.components.map((component) => {
    const source = resolve(component.filePath);
    if (resolve(dirname(source)) !== resolve(builtInDirectory) || !source.endsWith(".vue")) {
      return component;
    }

    const metadataSource = resolve(metadataSourceDirectory, basename(source));
    if (!existsSync(metadataSource)) return component;
    return { ...component, filePath: metadataSource };
  });
}
