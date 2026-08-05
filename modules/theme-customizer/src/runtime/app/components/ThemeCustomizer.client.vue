<script lang="ts" setup>
import { z } from "zod";
import { useClipboard, useToast, shallowRef, useRuntimeConfig, computed } from "#imports";

import { useConfirmDialog } from "../composables/confirm-dialog";

import { type CustomThemeColor, useThemeCustomizerStore } from "../stores/theme-customizer";
import { adjacentThemeShade, colorLabel, THEME_SHADES, themeTextClass } from "../utils/theme";
import type { ThemeShade } from "../types";

const store = useThemeCustomizerStore();
const confirm = useConfirmDialog();
const toast = useToast();
const { copy } = useClipboard({ legacy: true });

const name = shallowRef("");
const runtimeConfig = useRuntimeConfig();
const group = shallowRef(Object.keys(runtimeConfig.public.themeCustomizer.groups)[0] ?? "primary");
const error = shallowRef<string>();
const groupError = shallowRef<string>();
const groupOptions = computed(() =>
  store.colorGroups().map((value) => ({
    label: colorLabel(value),
    value
  }))
);
const nameSchema = z.string().trim().min(1, "Geef je kleur een naam.");
const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Geef je kleurgroep een naam.")
  .regex(/[\p{L}\p{N}]/u, "Gebruik minstens één letter of cijfer.");
const colorPickerUi = {
  selector: "w-40 h-40",
  track: "h-40"
};

/**
 * Creates a persisted custom color with the selected group's active shades.
 * @returns Nothing; invalid names are reported through the form error state.
 */
function createColor() {
  const parsedName = nameSchema.safeParse(name.value);
  if (!parsedName.success) {
    error.value = parsedName.error.issues[0]?.message;
    return;
  }

  error.value = undefined;
  store.addColor(parsedName.data, group.value);
  name.value = "";
}

/**
 * Adds a runtime group from the select menu and selects it for the next custom color.
 * @param name User-provided runtime group name.
 * @returns Nothing; invalid names are reported through the form error state.
 */
function createGroup(name: string) {
  const parsedGroupName = groupNameSchema.safeParse(name);
  if (!parsedGroupName.success) {
    groupError.value = parsedGroupName.error.issues[0]?.message;
    return;
  }

  const createdGroup = store.addGroup(parsedGroupName.data);
  if (!createdGroup) return;

  groupError.value = undefined;
  group.value = createdGroup;
}

/**
 * Updates one shade from the color picker popover.
 * @param id Persisted custom color identifier.
 * @param shade Shade level to update.
 * @param value New hex value, when supplied by the picker.
 * @returns Nothing.
 */
function updateColor(id: string, shade: ThemeShade, value: string | undefined) {
  if (value) store.updateShade(id, shade, value);
}

/**
 * Returns a CSS @theme snippet for one custom color.
 * @param color Custom color whose shades should be exported.
 * @returns A CSS `@theme` block containing all custom shade variables.
 */
function exportSnippet(color: CustomThemeColor) {
  return `@theme {\n${THEME_SHADES.map(
    (shade) => `  --color-${color.token}-${shade}: ${color.shades[shade]};`
  ).join("\n")}\n}`;
}

/**
 * Copies one custom color's complete @theme block.
 * @param color Custom color whose shades should be copied.
 * @returns A promise that resolves after the clipboard operation completes.
 */
async function exportColor(color: CustomThemeColor) {
  await copy(exportSnippet(color));
  toast.add({
    title: "Kleuren gekopieerd",
    description: "De kleuren zijn naar het klembord gekopieerd. Stuur ze op naar je ontwikkelaar!",
    color: "success"
  });
}

/**
 * Confirms and removes a persisted custom color.
 * @param color Custom color to remove.
 * @returns A promise that resolves after confirmation and removal complete.
 */
async function deleteColor(color: CustomThemeColor) {
  const confirmed = await confirm({
    title: `Kleur verwijderen?`,
    description: `${color.name} en alle aangepaste tinten worden verwijderd.`,
    color: "error"
  });

  if (!confirmed) return;
  store.removeColor(color.id);
  toast.add({ title: "Kleur verwijderd", color: "success" });
}
</script>

<template>
  <section class="space-y-8" aria-labelledby="theme-customizer-title">
    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
      <UFormField label="Naam" :error="error">
        <UInput v-model="name" placeholder="Bijvoorbeeld Oceaan" @keydown.enter="createColor" />
      </UFormField>
      <UFormField label="Kleurgroep" :error="groupError">
        <USelectMenu
          v-model="group"
          :items="groupOptions"
          create-item="always"
          value-key="value"
          class="w-full"
          @create="createGroup"
        />
      </UFormField>
      <UButton label="Kleur toevoegen" icon="i-lucide-plus" @click="createColor" />
    </div>

    <div v-if="store.colors.length" class="space-y-8">
      <article v-for="color in store.colors" :key="color.id" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold text-highlighted">{{ color.name }}</h3>
            <p class="text-sm text-muted">{{ color.group }}</p>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Kleur verwijderen"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="sm"
              @click="deleteColor(color)"
            />
            <UButton
              label="Kleuren exporteren"
              icon="i-lucide-copy"
              color="neutral"
              variant="outline"
              size="sm"
              @click="exportColor(color)"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="grid min-w-[54rem] grid-cols-[7rem_repeat(11,minmax(0,1fr))] gap-2">
            <div aria-hidden="true" />
            <div
              v-for="shade in THEME_SHADES"
              :key="shade"
              class="text-center text-xs font-semibold text-muted"
            >
              {{ shade }}
            </div>

            <div class="flex items-center text-sm font-semibold text-highlighted">
              {{ color.name }}
            </div>
            <UPopover
              v-for="shade in THEME_SHADES"
              :key="`${color.id}-${shade}`"
              :content="{ align: 'start', sideOffset: 8 }"
            >
              <button
                type="button"
                :class="[
                  'customizer-swatch aspect-square w-full rounded-md p-2 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  themeTextClass(shade)
                ]"
                :style="{
                  backgroundColor: 'var(--customizer-color)',
                  '--customizer-color': color.shades[shade],
                  '--customizer-hover-color': color.shades[adjacentThemeShade(shade)]
                }"
                :aria-label="`Wijzig ${color.name} ${shade}`"
              >
                {{ color.shades[shade] }}
              </button>

              <template #content>
                <div class="space-y-2 p-2">
                  <UColorPicker
                    v-model="color.shades[shade]"
                    format="hex"
                    size="sm"
                    :ui="colorPickerUi"
                    @update:model-value="updateColor(color.id, shade, $event)"
                  />
                  <HexInput
                    v-model="color.shades[shade]"
                    size="sm"
                    class="w-full"
                    @update:model-value="updateColor(color.id, shade, $event)"
                  />
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </article>
    </div>

    <UEmpty
      v-else
      icon="i-lucide-palette"
      title="Nog geen eigen kleuren"
      description="Voeg hierboven je eerste kleur toe."
    />
  </section>
</template>

<style scoped>
.customizer-swatch:hover {
  background-color: var(--customizer-hover-color) !important;
}
</style>
