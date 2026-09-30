<script setup lang="ts">
import type { AlertProps } from "@nuxt/ui";

defineProps<{
  /** Callout title. */
  title?: string;
  /** Supporting description when no default slot is supplied. */
  description?: string;
  /** Nuxt UI semantic color. */
  color?: AlertProps["color"];
  /** Optional Iconify icon name. */
  icon?: string;
}>();
</script>

<template>
  <UAlert :title="title" :description="description" :color="color" :icon="icon">
    <template v-if="$slots.default" #description>
      <slot />
    </template>
  </UAlert>
</template>
