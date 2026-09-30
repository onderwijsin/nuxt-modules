<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";

defineProps<{
  /** Button label when no default slot is supplied. */
  label?: string;
  /** Link destination. */
  to?: string;
  /** Nuxt UI semantic color. */
  color?: ButtonProps["color"];
  /** Nuxt UI button variant. */
  variant?: ButtonProps["variant"];
}>();
</script>

<template>
  <UButton :to="to" :color="color" :variant="variant">
    <slot>{{ label }}</slot>
  </UButton>
</template>
