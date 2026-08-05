<script lang="ts" setup>
import type { CustomThemeColor } from "../stores/theme-customizer";
import { colorLabel } from "../utils/theme";

type PaletteGroup = {
  name: string;
  label: string;
  colors: string[];
  customColors: CustomThemeColor[];
  runtimeGroup: boolean;
};

defineProps<{
  group: PaletteGroup;
  activeColor: string;
  loading?: boolean;
  error?: string;
  showCustomInput?: boolean;
}>();
const customHex = defineModel<string | undefined>("customHex");
const emit = defineEmits<{
  select: [color: string];
  delete: [];
  submit: [];
}>();
</script>

<template>
  <section>
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-sm font-bold text-highlighted">{{ group.label }}</p>
      <UButton
        v-if="group.runtimeGroup"
        :aria-label="`Verwijder ${group.label}`"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="xs"
        @click="emit('delete')"
      />
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="color in group.colors"
        :key="color"
        type="button"
        :aria-pressed="activeColor === color"
        :class="[
          'theme-option text-inverted',
          activeColor === color ? 'ring-2 ring-offset-1 ring-[var(--theme-option-ring)]' : ''
        ]"
        :style="{
          backgroundColor: `var(--color-${color}-500)`,
          '--theme-option-ring': `var(--color-${group.name}-500)`
        }"
        @click="emit('select', color)"
      >
        {{ colorLabel(color) }}
      </button>
      <button
        v-for="color in group.customColors"
        :key="color.id"
        type="button"
        :aria-pressed="activeColor === color.token"
        :class="[
          'theme-option text-inverted',
          activeColor === color.token ? 'ring-2 ring-offset-1 ring-[var(--theme-option-ring)]' : ''
        ]"
        :style="{
          backgroundColor: `var(--color-${color.token}-500)`,
          '--theme-option-ring': `var(--color-${color.token}-500)`
        }"
        @click="emit('select', color.token)"
      >
        {{ colorLabel(color.name) }}
      </button>
    </div>
    <div v-if="showCustomInput" class="mt-3 flex items-center gap-3">
      <p class="mb-0 text-xs font-bold">Hex</p>
      <HexInput
        v-model="customHex"
        class="w-full"
        size="sm"
        placeholder="#DBE1FF"
        allow-empty
        :error="error"
        :loading="loading"
        @blur="emit('submit')"
        @keydown-enter.prevent="emit('submit')"
      />
    </div>
    <p v-else class="text-xs text-muted">Voeg je eerste kleur toe aan deze groep</p>
  </section>
</template>

<style scoped>
.theme-option {
  min-height: 2rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  border-radius: 0.25rem;
  text-transform: capitalize;
}

.theme-option:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>
