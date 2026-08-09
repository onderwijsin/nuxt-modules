import { z } from "zod";
import { enabled, fromEntries, toEntries } from "@onderwijsin/nuxt-module-utils/shared";

import { hexColorSchema, THEME_SHADES } from "../runtime/app/utils/theme";

const palette = z.object(
  fromEntries(THEME_SHADES.map((shade) => [shade, hexColorSchema] as const))
);

export const themePaletteSchema = z.record(z.string(), palette);

const googleFontsOptionsSchema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  families: z
    .array(z.string().trim().min(1).max(100))
    .max(100)
    .transform((families) => [...new Set(families)])
    .optional()
});

const rateLimitSchema = z.object({
  enabled: z.boolean().optional(),
  max: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  ban: z.number().int().nonnegative().optional()
});
const endpointRateLimitSchema = z.object({
  palette: rateLimitSchema.optional(),
  fonts: rateLimitSchema.optional()
});

const themeDefaultsSchema = z
  .object({
    font: z.string().trim().min(1).max(100).optional(),
    radius: z.number().finite().nonnegative().optional()
  })
  .catchall(z.string().trim().min(1).max(100));

/** Runtime validation for configured theme palettes. */
const themeOptionsShape = {
  enabled,
  route: z
    .string()
    .trim()
    .regex(/^\/(?!\/)/u, "De themaroute moet een applicatie-relative route zijn.")
    .optional(),
  primary: themePaletteSchema.refine((palettes) => Object.keys(palettes).length > 0, {
    error: "Configureer minstens één palet in de primaire kleurgroep."
  }),
  secondary: themePaletteSchema.optional(),
  neutral: themePaletteSchema.optional(),
  googleFonts: googleFontsOptionsSchema.optional(),
  rateLimit: endpointRateLimitSchema.optional(),
  defaults: themeDefaultsSchema.optional()
};

export const themeOptionsSchema = z
  .object(themeOptionsShape)
  .catchall(
    z.union([
      z.boolean(),
      themePaletteSchema,
      googleFontsOptionsSchema,
      endpointRateLimitSchema,
      themeDefaultsSchema
    ])
  )
  .superRefine((options, context) => {
    const paletteNames = new Map<string, string>();
    for (const [name, value] of toEntries(options)) {
      if (
        name === "enabled" ||
        name === "route" ||
        name === "googleFonts" ||
        name === "rateLimit" ||
        name === "defaults"
      )
        continue;

      const result = themePaletteSchema.safeParse(value);
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: "Elke kleurgroep moet benoemde paletten met alle elf tinten bevatten."
        });
      } else {
        for (const paletteName of Object.keys(result.data)) {
          const previousGroup = paletteNames.get(paletteName);
          if (previousGroup) {
            context.addIssue({
              code: "custom",
              path: [name, paletteName],
              message: "Deze kleurnaam is al in gebruik. Kies een andere naam."
            });
          } else {
            paletteNames.set(paletteName, String(name));
          }
        }
      }
    }
  });
