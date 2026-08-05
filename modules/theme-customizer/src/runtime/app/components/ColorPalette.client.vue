<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";
import { computed } from "vue";
import { useToast } from "@nuxt/ui/composables";

import type { ThemePaletteShade } from "../composables/generated-palette.client";
import { normalizeCssColorToHex } from "../utils/color";
import { adjacentThemeShade, colorLabel, THEME_SHADES, themeTextClass } from "../utils/theme";

type ThemePaletteColors = Record<string, string>;
type ThemePaletteHex = Partial<Record<string, string>>;
type ThemePalettes = Partial<Record<string, ThemePaletteShade[]>>;

const props = defineProps<{
  colors: ThemePaletteColors;
  groups: string[];
  emptyGroups: string[];
  customHex: ThemePaletteHex;
  generatedPalettes: ThemePalettes;
}>();

const rows = computed(() =>
  props.groups.map((group) => ({
    group,
    label: colorLabel(group),
    empty: props.emptyGroups.includes(group)
  }))
);

const toast = useToast();
const { copy } = useClipboard({ legacy: true });

let colorContext: CanvasRenderingContext2D | null | undefined;

function colorToken(group: string, shade: number) {
  return `--color-${props.colors[group]}-${shade}`;
}

function colorHex(group: string, shade: number) {
  const generatedShade = props.generatedPalettes[group]?.find((item) => item.level === shade);
  if (generatedShade) return `#${generatedShade.hex}`;
  if (!import.meta.client) return "";

  colorContext ??= document.createElement("canvas").getContext("2d");
  return normalizeCssColorToHex(
    getComputedStyle(document.documentElement).getPropertyValue(colorToken(group, shade)).trim(),
    colorContext
  );
}

/**
 * Copies a shade value and confirms the action with the global toast.
 * @param group Theme color group containing the shade.
 * @param shade Theme shade level to copy.
 * @returns A promise that resolves after the copy operation completes.
 */
async function copyColor(group: string, shade: number) {
  const hex = colorHex(group, shade);
  if (!hex.startsWith("#")) return;

  await copy(hex);
  toast.add({ title: "Kleurcode gekopieerd", color: "success" });
}

/**
 * Returns whether a generated shade matches the custom source hex for its row.
 * @param group Theme color group containing the shade.
 * @param shade Theme shade level to compare.
 * @returns Whether the shade matches the group's custom source hex.
 */
function isCustomShade(group: string, shade: number) {
  if (props.colors[group] !== `theme-picker-${group}-custom`) return false;

  const customHex = props.customHex[group]?.replace(/^#/, "").toLowerCase();
  const paletteShade = props.generatedPalettes[group]?.find((item) => item.level === shade);

  return customHex !== undefined && paletteShade?.hex.toLowerCase() === customHex;
}
</script>

<template>
  <section aria-label="Kleurpalette" class="overflow-visible">
    <div class="min-w-[48rem]">
      <div class="grid grid-cols-[7rem_repeat(11,minmax(0,1fr))] gap-2">
        <div aria-hidden="true" />
        <div
          v-for="shade in THEME_SHADES"
          :key="shade"
          class="text-center text-xs font-semibold text-muted"
        >
          <span>{{ shade }}</span>
        </div>

        <template v-for="row in rows" :key="row.group">
          <div class="flex items-center text-sm font-semibold text-highlighted">
            {{ row.label }}
          </div>
          <div v-if="row.empty" class="col-span-11 relative mb-6 grid grid-cols-11 gap-2">
            <div
              v-for="shade in THEME_SHADES"
              :key="shade"
              aria-hidden="true"
              class="aspect-square"
            />
            <div
              class="absolute inset-0 flex items-center rounded-md bg-muted px-4 text-sm text-muted"
            >
              Deze groep bevat nog geen kleuren. Voeg nu je eerste kleur toe.
            </div>
          </div>
          <template v-else>
            <div
              v-for="shade in THEME_SHADES"
              :key="`${row.group}-${shade}`"
              :aria-label="`${row.label} ${shade}${isCustomShade(row.group, shade) ? ', custom hex' : ''}`"
              :class="[
                'palette-swatch aspect-square w-full rounded-md mb-6 p-2 text-center grid place-items-center text-xs font-medium transition-colors',
                themeTextClass(shade),
                isCustomShade(row.group, shade)
                  ? 'ring-2 ring-[var(--palette-color)] ring-offset-2 ring-offset-default'
                  : '',
                'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
              ]"
              :style="{
                backgroundColor: 'var(--palette-color)',
                '--palette-color': `var(${colorToken(row.group, shade)})`,
                '--palette-hover-color': `var(${colorToken(row.group, adjacentThemeShade(shade))})`
              }"
              :title="isCustomShade(row.group, shade) ? 'Aangepaste HEX' : undefined"
              role="button"
              tabindex="0"
              @click="copyColor(row.group, shade)"
              @keydown.enter.prevent="copyColor(row.group, shade)"
              @keydown.space.prevent="copyColor(row.group, shade)"
            >
              {{ colorHex(row.group, shade) }}
            </div>
          </template>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.palette-swatch:hover {
  background-color: var(--palette-hover-color) !important;
}
</style>
