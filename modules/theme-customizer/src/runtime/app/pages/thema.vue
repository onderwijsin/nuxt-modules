<script lang="ts" setup>
import { useGeneratedPalette } from "../composables/generated-palette.client";
import { useThemeCustomizerStore } from "../stores/theme-customizer";
import { computed, useAppConfig } from "#imports";

const appConfig = useAppConfig();
const { customHex, generatedPalettes } = useGeneratedPalette();
const themeCustomizer = useThemeCustomizerStore();
const emptyGroups = computed(() =>
  themeCustomizer.groups.filter(
    (group) => !themeCustomizer.colors.some((color) => color.group === group)
  )
);
</script>

<template>
  <UContainer>
    <UPage class="pb-16">
      <UPageHeader
        title="Kleurpalette"
        description="Op deze pagina zie je de kleurtinten en rondingen voor het huidige thema"
        class="mb-8"
      />
      <ThemeCustomizerColorPalette
        :colors="appConfig.ui.colors"
        :groups="themeCustomizer.colorGroups()"
        :empty-groups="emptyGroups"
        :custom-hex="customHex"
        :generated-palettes="generatedPalettes"
      />

      <UPageHeader
        title="Themakleur aanpassen"
        description="Wanneer je in de kleurkiezer een #HEX-kleur invoert, wordt via de ColorFYI API automatisch een kleurenpalet gegenereerd dat zo dicht mogelijk bij de ingevoerde kleur ligt. Wil je meer controle over het samenstellen van de kleuren? Hieronder kun je je eigen kleurthema maken."
        class="mb-8"
      />
      <ThemeCustomizerEditor />
    </UPage>
  </UContainer>
</template>
