import { z } from "zod";

export const THEME_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Default palette token used for built-in semantic groups. */
export const builtInDefaultTokens: Record<string, string> = {
  neutral: "gray"
};

/** Shared validation schema for six-digit HEX colors. */
export const hexColorSchema = z.string().regex(/^#[\da-f]{6}$/i, {
  error: "Voer een geldige hex-kleur in, bijvoorbeeld #DBE1FF."
});

/**
 * Converts a group or palette token into a readable label.
 * @param color Group or palette token to format.
 * @returns A readable title-cased label.
 */
export function colorLabel(color: string) {
  return color
    .trim()
    .replace(/[-_\s]+/g, " ")
    .replace(
      /(^|\s)(\p{L})/gu,
      (_, prefix: string, character: string) => `${prefix}${character.toUpperCase()}`
    );
}

/**
 * Returns the adjacent shade used for palette-swatch hover feedback.
 * @param shade Shade level whose adjacent value should be selected.
 * @returns The adjacent shade, or the input shade at the palette boundary.
 */
export function adjacentThemeShade(shade: number) {
  const index = THEME_SHADES.indexOf(shade as (typeof THEME_SHADES)[number]);
  const adjacentIndex = shade < 500 ? index + 1 : index - 1;

  return THEME_SHADES[adjacentIndex] ?? shade;
}

/**
 * Returns a readable foreground utility class for a shade.
 * @param shade Shade level whose contrast class should be selected.
 * @returns A Tailwind text color utility class.
 */
export function themeTextClass(shade: number) {
  return shade < 500 ? "text-black" : "text-white";
}
