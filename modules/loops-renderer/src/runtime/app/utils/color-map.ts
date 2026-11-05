import { toEntries } from "@onderwijsin/nuxt-module-utils/shared";
import type { LoopsRendererColorMap, LoopsRendererColorProperty } from "../../types";

/** A normalized snapshot of a consumer's role-specific palette. */
export type CompiledColorMap = Map<LoopsRendererColorProperty, ReadonlyMap<string, string>>;

/**
 * Normalizes supported source hex colors without accepting arbitrary CSS.
 * @param color - A source hex color.
 * @returns Lowercase six-digit hex, or undefined for unsupported values.
 */
export function normalizeSourceColor(color: string): string | undefined {
  if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) return undefined;
  const hex = color.toLowerCase();
  return hex.length === 4
    ? `#${hex
        .slice(1)
        .split("")
        .map((channel) => channel + channel)
        .join("")}`
    : hex;
}

/**
 * Copies and validates source keys once when a mapper is created.
 * @param mappings - Trusted application palettes, separated by CSS role.
 * @returns Normalized source palettes independent of later input mutations.
 */
export function compileColorMap(mappings: LoopsRendererColorMap): CompiledColorMap {
  const compiled: CompiledColorMap = new Map();
  for (const [property, palette] of toEntries(mappings)) {
    if (!palette) continue;
    const normalized = new Map<string, string>();
    for (const [source, target] of toEntries(palette)) {
      const color = normalizeSourceColor(source);
      if (!color) throw new TypeError(`Invalid source color in ${property}: ${source}`);
      if (normalized.has(color))
        throw new TypeError(`Duplicate normalized source color in ${property}: ${color}`);
      normalized.set(color, target);
    }
    compiled.set(property, normalized);
  }
  return compiled;
}
