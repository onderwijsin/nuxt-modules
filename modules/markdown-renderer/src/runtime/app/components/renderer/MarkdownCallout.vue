<script setup lang="ts">
import type { AlertProps } from "@nuxt/ui";
import { extendComponentMeta } from "#imports";

extendComponentMeta({
  markdownRenderer: {
    label: "Callout",
    description: "A component used to highlight important information.",
    nodeType: "block",
    props: {
      color: {
        values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"],
        tags: [{ name: "deprecated", text: "Use newProp instead." }]
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
