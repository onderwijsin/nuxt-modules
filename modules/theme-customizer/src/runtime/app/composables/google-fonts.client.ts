import type { ThemeFontOption } from "../types";
import { computed, refDebounced, shallowRef, useRuntimeConfig, watch } from "#imports";
import { ofetch } from "ofetch";
import { attempt } from "module-utils/shared";

/**
 * Loads searchable Google Font options for the theme picker.
 * @returns Font options, search state, loading state, and a lazy loading action.
 */
export function useGoogleFonts() {
  const runtimeConfig = useRuntimeConfig();
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

    const result = await attempt(() =>
      ofetch<ThemeFontOption[]>("/api/theme/fonts", {
        query: { q: debouncedSearchTerm.value }
      })
    );
    if (
      result.error === null &&
      result.data !== null &&
      currentRequestId === requestId &&
      result.data.length
    ) {
      fonts.value = result.data;
    }
    if (currentRequestId === requestId) {
      loading.value = false;
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
