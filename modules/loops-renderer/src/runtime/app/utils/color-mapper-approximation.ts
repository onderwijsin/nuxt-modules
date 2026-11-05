import { isFiniteNumber } from "@onderwijsin/nuxt-module-utils/shared";
import type {
  LoopsRendererColorMap,
  LoopsRendererColorMapper,
  LoopsRendererColorMappingOptions
} from "../../types";
import { compileColorMap, normalizeSourceColor } from "./color-map";
import { oklabDistance, sourceHexToOklab } from "./oklab";

/**
 * Creates the exact-first mapper selected by the module's approximation opt-in.
 * @param mappings - Source hex to trusted CSS colors, separated by CSS role.
 * @param options - Maximum allowed source-color distance, defaulting to 0.03.
 * @returns A synchronous mapper; unmatched or distant colors retain their original values.
 */
export function createLoopsColorMapper(
  mappings: LoopsRendererColorMap,
  options: LoopsRendererColorMappingOptions = {}
): LoopsRendererColorMapper {
  const maxDeltaE = options.maxDeltaE ?? 0.03;
  if (!isFiniteNumber(maxDeltaE) || maxDeltaE < 0) {
    throw new RangeError("maxDeltaE must be a finite, non-negative OKLab distance.");
  }
  const compiled = compileColorMap(mappings);
  const candidates = new Map(
    [...compiled].map(([property, palette]) => [
      property,
      [...palette]
        .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
        .map(([source, target]) => ({ target, lab: sourceHexToOklab(source) }))
    ])
  );

  return (color, context) => {
    const source = normalizeSourceColor(color);
    if (!source) return undefined;
    const exact = compiled.get(context.property)?.get(source);
    if (exact !== undefined) return exact;

    const lab = sourceHexToOklab(source);
    let nearestDistance = Infinity;
    let nearest: string | undefined;
    for (const candidate of candidates.get(context.property) ?? []) {
      const distance = oklabDistance(lab, candidate.lab);
      // Canonical source order breaks equal-distance ties independently of insertion order.
      if (distance <= maxDeltaE && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate.target;
      }
    }
    return nearest;
  };
}
