<script lang="ts" setup>
import { shallowRef, watch } from "vue";

const props = defineProps<{
  modelValue: number;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const radii = [0, 0.125, 0.175, 0.25, 0.325, 0.375];
const radiusInput = shallowRef(`${props.modelValue}`);

watch(
  () => props.modelValue,
  (value) => {
    radiusInput.value = `${value}`;
  }
);

function setRadius(radius: number) {
  emit("update:modelValue", radius);
}

function submitRadius() {
  const normalizedRadius = radiusInput.value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalizedRadius)) return;

  setRadius(Number(normalizedRadius));
}
</script>

<template>
  <section>
    <p class="mb-2 text-sm font-bold text-highlighted">Afronding</p>
    <div class="grid grid-cols-3 gap-1.5 mb-3">
      <button
        v-for="radius in radii"
        :key="radius"
        type="button"
        :aria-pressed="modelValue === radius"
        :class="[
          'theme-option bg-elevated text-highlighted',
          modelValue === radius ? 'ring-2 ring-offset-1 ring-primary' : ''
        ]"
        @click="setRadius(radius)"
      >
        {{ radius }}rem
      </button>
    </div>
    <div class="mt-3 flex items-center gap-3">
      <p class="mb-0 text-xs font-bold">Radius</p>
      <RadiusInput
        v-model="radiusInput"
        class="w-full"
        size="sm"
        @blur="submitRadius"
        @keydown-enter.prevent="submitRadius"
      />
    </div>
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
