<script setup lang="ts">
import type { AlertProps } from "@nuxt/ui";
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Callout",
  description: "A component used to highlight important information.",
  type: "block",
  props: {
    color: {
      values: [
        "primary",
        "secondary",
        "success",
        "info",
        "warning",
        "error",
        "neutral"
      ] satisfies Array<AlertProps["color"]>
    }
  }
});

defineProps<{
  /** Callout title. */
  title?: string;
  /** Nuxt UI semantic color. */
  color?: AlertProps["color"];
  /** Optional Iconify icon name. */
  icon?: string;
}>();
</script>

<template>
  <UAlert :title="title" :color="color" :icon="icon">
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
  </UAlert>
</template>
