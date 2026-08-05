import { refDebounced } from "@vueuse/core";
import { $fetch } from "ofetch";
import { useRuntimeConfig } from "nuxt/app";
import { computed, shallowRef, watch } from "vue";

import { DEFAULT_THEME_FONT } from "../utils/font";
import type { ThemeCustomizerRuntimeConfig, ThemeFontOption } from "../types";

const STANDARD_FONTS = [
  DEFAULT_THEME_FONT,
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "DM Sans",
  "Inter",
  "Poppins",
  "Nunito Sans",
  "Raleway",
  "Merriweather",
  "Playfair Display"
];

/**
 * Loads searchable Google Font options for the theme picker.
 * @returns Font options, search state, loading state, and a lazy loading action.
 */
export function useGoogleFonts() {
  const runtimeConfig = useRuntimeConfig() as ThemeCustomizerRuntimeConfig;
  const configuredFonts = runtimeConfig.public.themeCustomizer.googleFonts?.families ?? [];
  const fallbackFonts = configuredFonts.length ? configuredFonts : STANDARD_FONTS;
  const fonts = shallowRef<ThemeFontOption[]>(toFontOptions(fallbackFonts));
  const searchTerm = shallowRef("");
  const loading = shallowRef(false);
  const loaded = shallowRef(false);
  const debouncedSearchTerm = refDebounced(searchTerm, 250);
  let requestId = 0;

  const items = computed(() => fonts.value);

  /**
   * Fetches font options for the current search term.
   * @returns A promise that resolves after the options have been updated.
   */
  async function loadFonts(): Promise<void> {
    const currentRequestId = ++requestId;
    loading.value = true;

    try {
      const response = await $fetch<ThemeFontOption[]>("/api/theme/fonts", {
        query: { q: debouncedSearchTerm.value }
      });
      if (currentRequestId === requestId && response.length) fonts.value = response;
    } catch {
      // Keep the curated fallback options available when the API is unavailable.
    } finally {
      if (currentRequestId === requestId) loading.value = false;
    }

    loaded.value = true;
  }

  watch(debouncedSearchTerm, () => {
    if (loaded.value) void loadFonts();
  });

  return { items, loading, loadFonts, searchTerm };
}

/**
 * Converts configured family names into SelectMenu items.
 * @param families Font family names to convert.
 * @returns SelectMenu-compatible font options.
 */
function toFontOptions(families: string[]): ThemeFontOption[] {
  return families.map((family) => ({ label: family, value: family }));
}
