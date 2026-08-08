import { z } from "zod";
import { reactive, useAppConfig, useRuntimeConfig, useState } from "#imports";
import { ofetch } from "ofetch";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

import { createThemeRuntimeAdapter } from "../adapters/theme-runtime.client";
import { builtInDefaultTokens, hexColorSchema } from "../utils/theme";

export type ThemePaletteShade = {
  level: number;
  hex: string;
};

const paletteResponseSchema = z.object({
  hex: z.string().regex(/^[\da-f]{6}$/i),
  shades: z
    .array(
      z.object({
        level: z.number().int(),
        hex: z.string().regex(/^[\da-f]{6}$/i)
      })
    )
    .length(11)
});

/**
 * Creates runtime Tailwind color tokens from a hex value for the temporary theme picker.
 * @returns Reactive palette state and actions for generating, resetting, and removing palettes.
 */
export function useGeneratedPalette() {
  const appConfig = useAppConfig();
  const colors = appConfig.ui.colors;
  const runtime = createThemeRuntimeAdapter(appConfig);
  const runtimeConfig = useRuntimeConfig();
  const generatedTokenNames = useState<Record<string, string>>(
    "theme-picker-generated-token-names",
    () => ({})
  );
  const customHex = useState<Record<string, string>>("theme-picker-custom-hex", () => ({}));
  const generatedPalettes = useState<Record<string, ThemePaletteShade[]>>(
    "theme-picker-generated-palettes",
    () => ({})
  );
  const loading = reactive<Record<string, boolean>>({});
  const errors = reactive<Record<string, string>>({});

  /**
   * Gets the configured default palette token for a color group.
   * @param group Theme color group to inspect.
   * @returns The default palette token, or an empty string when none is configured.
   */
  function defaultPaletteToken(group: string) {
    const configuredDefault = runtimeConfig.public.themeCustomizer.defaults?.[group];
    return (
      (typeof configuredDefault === "string" &&
      runtimeConfig.public.themeCustomizer.groups[group]?.includes(configuredDefault)
        ? configuredDefault
        : undefined) ??
      builtInDefaultTokens[group] ??
      runtimeConfig.public.themeCustomizer.groups[group]?.[0] ??
      colors[group] ??
      ""
    );
  }

  /**
   * Restores a semantic color role to its default palette.
   * @param group Theme color group to reset.
   * @returns Nothing.
   */
  function resetPalette(group: string) {
    removeGeneratedPalette(group);
    const token = defaultPaletteToken(group);
    if (!token) return;
    runtime.setActiveColor(group, token);
  }

  /**
   * Removes the temporary HEX palette associated with a group.
   * @param group Theme color group whose generated palette should be removed.
   * @returns Nothing.
   */
  function removeGeneratedPalette(group: string) {
    runtime.removeColorTokens(generatedTokenNames.value[group]);
    delete generatedTokenNames.value[group];
    delete customHex.value[group];
    delete generatedPalettes.value[group];
    delete errors[group];
  }

  /**
   * Fetches, validates, and applies a generated palette for one semantic color role.
   * @param group Theme color group for the generated palette.
   * @param hex Source hex value used to generate the palette.
   * @returns Whether the palette was generated and applied successfully.
   */
  async function generatePalette(group: string, hex: string) {
    if (loading[group]) return false;

    const trimmedHex = hex.trim();
    if (!trimmedHex) {
      resetPalette(group);
      return true;
    }

    const parsedHex = hexColorSchema.safeParse(trimmedHex);
    if (!parsedHex.success) {
      errors[group] = parsedHex.error.issues[0]?.message ?? "Voer een geldige hex-kleur in.";
      return false;
    }

    loading[group] = true;
    delete errors[group];

    try {
      const result = await attempt(() =>
        ofetch<unknown>("/api/_theme-customizer/palette", {
          query: { hex: parsedHex.data }
        })
      );
      const response = result.data;
      if (!response) {
        errors[group] = "Het kleurenpalet kon niet worden opgehaald. Probeer het opnieuw.";
        return false;
      }
      const parsedResponse = paletteResponseSchema.safeParse(response);

      if (!parsedResponse.success) {
        errors[group] = "De API gaf een ongeldig kleurenpalet terug.";
        return false;
      }

      const tokenName = `theme-picker-${group}-custom`;
      runtime.removeColorTokens(generatedTokenNames.value[group]);

      for (const shade of parsedResponse.data.shades) {
        runtime.applyColor({ token: tokenName, shades: { [shade.level]: `#${shade.hex}` } });
      }

      generatedTokenNames.value[group] = tokenName;
      customHex.value[group] = parsedResponse.data.hex;
      generatedPalettes.value[group] = parsedResponse.data.shades;
      runtime.setActiveColor(group, tokenName);
      return true;
    } finally {
      loading[group] = false;
    }
  }

  return {
    customHex,
    errors,
    generatePalette,
    generatedPalettes,
    loading,
    removeGeneratedPalette,
    resetPalette
  };
}
