import { z } from "zod";

import { hexColorSchema, THEME_SHADES } from "../runtime/app/utils/theme";
import type { ThemeCustomizerOptions } from "../types";

const palette = z.object(
  Object.fromEntries(THEME_SHADES.map((shade) => [shade, hexColorSchema])) as Record<
    (typeof THEME_SHADES)[number],
    typeof hexColorSchema
  >
);

export const themePaletteSchema = z.record(z.string(), palette);

/** Runtime validation for configured theme palettes. */
export const themeOptionsShape = {
  primary: themePaletteSchema.refine((palettes) => Object.keys(palettes).length > 0, {
    error: "Configureer minstens één palet in de primaire kleurgroep."
  }),
  secondary: themePaletteSchema.optional(),
  neutral: themePaletteSchema.optional()
};

export const themeOptionsSchema = z
  .looseObject(themeOptionsShape)
  .superRefine((options, context) => {
    for (const [name, value] of Object.entries(options)) {
      if (name === "enabled") continue;

      const result = themePaletteSchema.safeParse(value);
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: "Elke kleurgroep moet benoemde paletten met alle elf tinten bevatten."
        });
      }
    }
  });

/**
 * Parses all known and custom theme groups into the module option shape.
 * @param options Raw module options to validate and parse.
 * @returns Validated theme customizer options.
 */
export function parseThemeOptions(options: unknown): ThemeCustomizerOptions {
  const result = themeOptionsSchema.safeParse(options);
  if (!result.success) throw new Error("Invalid module options ☝. Exiting.");

  return result.data as ThemeCustomizerOptions;
}
