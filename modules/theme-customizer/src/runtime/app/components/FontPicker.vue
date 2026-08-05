<script lang="ts" setup>
import { shallowRef } from "vue";

import { useGoogleFonts } from "../composables/google-fonts.client";
import { useThemeCustomizerStore } from "../stores/theme-customizer";
import { sanitizeFontFamily } from "../utils/font";

const themeCustomizer = useThemeCustomizerStore();
const {
  items: fontItems,
  loading: fontsLoading,
  loadFonts,
  searchTerm: fontSearch
} = useGoogleFonts();
const fontMenuOpen = shallowRef(false);

/**
 * Lazily loads font options when the searchable menu opens.
 * @param open Whether the font menu is open.
 * @returns Nothing.
 */
function setFontMenuOpen(open: boolean) {
  fontMenuOpen.value = open;
  if (open) void loadFonts();
}

/**
 * Creates the safe inline font declaration used by each menu option.
 * @param family Font family to display.
 * @returns Inline style for the option label.
 */
function fontFamilyStyle(family: string) {
  const safeFamily = sanitizeFontFamily(family) ?? "sans-serif";
  return { fontFamily: `'${safeFamily}', sans-serif` };
}
</script>

<template>
  <section>
    <p class="mb-2 text-sm font-bold text-highlighted">Lettertype</p>
    <UFormField :ui="{ label: 'hidden', root: 'mt-0!', container: 'mt-0' }">
      <USelectMenu
        :model-value="themeCustomizer.font"
        v-model:open="fontMenuOpen"
        v-model:search-term="fontSearch"
        value-key="value"
        ignore-filter
        :items="fontItems"
        :loading="fontsLoading"
        search-input
        icon="i-lucide-type"
        class="w-full"
        :ui="{ item: 'text-[13px]' }"
        @update:model-value="themeCustomizer.setFont"
        @update:open="setFontMenuOpen"
      >
        <template #item="{ item }">
          <span :style="fontFamilyStyle(item.value)">{{ item.label }}</span>
        </template>
      </USelectMenu>
    </UFormField>
  </section>
</template>
