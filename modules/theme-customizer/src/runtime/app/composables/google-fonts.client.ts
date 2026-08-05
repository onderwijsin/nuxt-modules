import type { ThemeCustomizerRuntimeConfig, ThemeFontOption } from "../types";
import { $fetch, computed, refDebounced, shallowRef, useRuntimeConfig, watch } from "#imports";

/**
 * Loads searchable Google Font options for the theme picker.
 * @returns Font options, search state, loading state, and a lazy loading action.
 */
export function useGoogleFonts() {
  const runtimeConfig = useRuntimeConfig() as unknown as ThemeCustomizerRuntimeConfig;
  const configuredFonts = runtimeConfig.public.themeCustomizer.googleFonts?.families ?? [];
  const fonts = shallowRef<ThemeFontOption[]>(toFontOptions(configuredFonts));
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
