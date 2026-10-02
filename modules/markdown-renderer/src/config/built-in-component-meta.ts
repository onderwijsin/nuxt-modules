import { existsSync, readFileSync } from "node:fs";

import { dirname, resolve } from "pathe";
import type { ComponentMetaParserOptions } from "nuxt-component-meta";
import { parse } from "vue/compiler-sfc";

/**
 * Gives built-in components their declaration as the metadata inference source.
 * Runtime registration still points at the compiled Vue component.
 * @param options Component-meta parser options for this Nuxt application.
 * @param builtInDirectory Directory containing the module's built-in renderer components.
 */
export function useBuiltInComponentDeclarations(
  options: ComponentMetaParserOptions,
  builtInDirectory: string
): void {
  const sources = new Map<string, string>();
  options.components = options.components.map((component) => {
    const source = resolve(component.filePath);
    if (resolve(dirname(source)) !== resolve(builtInDirectory) || !source.endsWith(".vue")) {
      return component;
    }

    const declaration = source.replace(/\.vue$/, ".vue.d.ts");
    if (!existsSync(declaration)) return component;
    sources.set(declaration, source);
    return { ...component, filePath: declaration };
  });

  if (!sources.size) return;
  options.transformers ??= [];
  options.transformers.push((component, code) => {
    const source = sources.get(resolve(component.fullPath));
    if (!source) return { component, code };
    const vue = readFileSync(source, "utf8");
    const script = parse(vue, { filename: source }).descriptor.scriptSetup?.content;
    return { component, code: script ? `${code}\n${script}` : code };
  });
}
