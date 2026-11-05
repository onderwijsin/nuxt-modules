import type {
  LoopsRendererColorMap,
  LoopsRendererColorMapper,
  LoopsRendererColorMappingOptions
} from "../../types";
import { compileColorMap, normalizeSourceColor } from "./color-map";

/**
 * Creates the exact-only mapper selected when approximation is disabled.
 * @param mappings - Source hex to trusted CSS colors, separated by CSS role.
 * @param _options - Shared utility options; distance has no effect in an exact-only build.
 * @returns A synchronous mapper that retains unmatched source colors.
 */
export function createLoopsColorMapper(
  mappings: LoopsRendererColorMap,
  _options?: LoopsRendererColorMappingOptions
): LoopsRendererColorMapper {
  const compiled = compileColorMap(mappings);
  return (color, context) => {
    const source = normalizeSourceColor(color);
    return source ? compiled.get(context.property)?.get(source) : undefined;
  };
}
