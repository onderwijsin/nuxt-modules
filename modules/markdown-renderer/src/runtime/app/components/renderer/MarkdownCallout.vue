<script setup lang="ts">
import type { AlertProps } from "@nuxt/ui";

declare function extendComponentMeta(meta: Record<string, unknown>): void;

extendComponentMeta({
  markdownRenderer: {
    label: "Callout",
    description: "A component used to highlight important information.",
    nodeType: "block",
    props: {
      color: {
        values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
      }
    }
  }
});

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
      <slot name="description" />
    </template>
  </UAlert>
</template>
