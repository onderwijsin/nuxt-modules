<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Button",
  description: "A clickable button component.",
  type: "block",
  properties: {
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
    },
    size: {
      values: ["xs", "sm", "md", "lg", "xl"] satisfies Array<ButtonProps["size"]>
    },
    icon: {
      input: {
        type: "icon",
        collections: ["lucide"]
      }
    }
  }
});

withDefaults(
  defineProps<{
    /** Label displayed inside the button. */
    label: string;
    /** Link destination. Use either full URL or internal route path. */
    to: string;
    /** The color tone of the button. */
    color?: ButtonProps["color"];
    /** The visual style variant of the button. */
    variant?: ButtonProps["variant"];
    /** The size of the button. */
    size?: ButtonProps["size"];
    /** The icon displayed inside the button. */
    icon?: string;
    /** Whether the icon should be displayed after the label. */
    trailing?: boolean;
    /** Whether the button should trigger a download of the linked resource. */
    download?: boolean;
  }>(),
  {
    color: "primary",
    variant: "soft",
    size: "md"
  }
);
</script>

<template>
  <UButton v-bind="$props" />
</template>
