<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Button",
  description: "A clickable button component.",
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
      ] satisfies Array<ButtonProps["color"]>
    },
    variant: {
      values: ["solid", "outline", "soft", "subtle", "ghost", "link"] satisfies Array<
        ButtonProps["variant"]
      >
    }
  }
});

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
  <UButton :to="to" :color="color" :variant="variant" :label="label" />
</template>
