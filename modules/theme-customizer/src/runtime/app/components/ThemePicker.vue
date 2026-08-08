<script lang="ts" setup>
import { useGeneratedPalette } from "../composables/generated-palette.client";
import { useThemeCustomizerStore } from "../stores/theme-customizer";
import { NEUTRAL_COLORS } from "../utils/constants";
import { colorLabel } from "../utils/theme";
import type { AppConfig } from "nuxt/schema";
import { useThemeCustomizerConfirmDialog } from "../composables/confirm-dialog";

import { computed, reactive, useAppConfig, useRuntimeConfig } from "#imports";

type ThemeRadius = AppConfig["ui"]["radius"];

const appConfig = useAppConfig();
const runtimeConfig = useRuntimeConfig();
const { errors, generatePalette, loading, removeGeneratedPalette, resetPalette } =
  useGeneratedPalette();
const themeCustomizer = useThemeCustomizerStore();
const confirm = useThemeCustomizerConfirmDialog();
const groups = computed(() =>
  themeCustomizer.colorGroups().map((name) => {
    const runtimeGroup = themeCustomizer.isRuntimeGroup(name);

    return {
      name,
      label: colorLabel(name),
      colors:
        name === "neutral"
          ? [...NEUTRAL_COLORS, ...(runtimeConfig.public.themeCustomizer.groups[name] ?? [])]
          : (runtimeConfig.public.themeCustomizer.groups[name] ?? []),
      customColors: themeCustomizer.colors.filter((color) => color.group === name),
      runtimeGroup
    };
  })
);
const customHex = reactive<Record<string, string>>({});

/**
 * Updates a selected palette for any configured color group.
 * @param group Theme color group to update.
 * @param color Palette token to activate.
 * @returns Nothing.
 */
function setColor(group: string, color: string) {
  themeCustomizer.setActiveColor(group, color);
}

/**
 * Validates a custom palette input or restores the group's configured default when cleared.
 * @param group Theme color group whose palette should be submitted.
 * @returns A promise that resolves after palette generation or reset completes.
 */
async function submitPalette(group: string) {
  const hex = customHex[group] ?? "";
  if (!hex.trim()) {
    resetPalette(group);
    return;
  }

  await generatePalette(group, hex);
}

/**
 * Confirms and removes a runtime group together with every color in it.
 * @param group Runtime color group to remove.
 * @returns A promise that resolves after confirmation and removal complete.
 */
async function deleteGroup(group: string) {
  const confirmed = await confirm({
    title: "Kleurgroep verwijderen?",
    description: `${colorLabel(group)} en alle aangepaste kleuren erin worden verwijderd.`,
    color: "error"
  });

  if (!confirmed) return;
  removeGeneratedPalette(group);
  themeCustomizer.removeGroup(group);
}

/**
 * Applies a selected radius to Nuxt UI's runtime app configuration.
 * @param radius Radius value in rem units.
 * @returns Nothing.
 */
function setRadius(radius: ThemeRadius) {
  appConfig.ui.radius = radius;
  if (import.meta.client) {
    document.documentElement.style.setProperty("--ui-radius", `${radius}rem`);
  }
}
</script>

<template>
  <UPopover :content="{ align: 'end', sideOffset: 12 }">
    <UButton
      aria-label="Open kleurkiezer"
      icon="i-lucide-palette"
      variant="ghost"
      color="neutral"
    />

    <template #content>
      <div class="max-h-[80vh] w-80 space-y-8 overflow-y-auto p-3 pb-4">
        <div class="w-full flex justify-end">
          <UButton
            color="neutral"
            size="xs"
            variant="ghost"
            label="Kleuroverzicht"
            trailing-icon="lucide:arrow-right"
            :to="{ name: 'theme-customizer' }"
          />
        </div>
        <ThemeCustomizerPaletteGroupPicker
          v-for="(group, index) in groups"
          :key="index"
          v-model:custom-hex="customHex[group.name]"
          :group="group"
          :active-color="appConfig.ui.colors[group.name] ?? ''"
          :loading="loading[group.name]"
          :error="errors[group.name]"
          :show-custom-input="!group.runtimeGroup || group.customColors.length > 0"
          :class="{ '-mt-6': index === 0 }"
          @select="setColor(group.name, $event)"
          @delete="deleteGroup(group.name)"
          @submit="submitPalette(group.name)"
        />
        <ThemeCustomizerRadiusPicker
          :model-value="appConfig.ui.radius"
          @update:model-value="setRadius"
        />
        <ThemeCustomizerFontPicker />
      </div>
    </template>
  </UPopover>
</template>
