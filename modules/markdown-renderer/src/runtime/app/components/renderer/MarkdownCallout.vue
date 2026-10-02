<script setup lang="ts">
import type { AlertProps, ButtonProps } from "@nuxt/ui";
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Callout",
  description: "A component used to highlight important information.",
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
      ] satisfies Array<AlertProps["color"]>
    },
    variant: {
      values: ["solid", "outline", "soft", "subtle"] satisfies Array<AlertProps["variant"]>
    },
    icon: {
      input: {
        type: "icon",
        collections: ["lucide"]
      }
    },
    orientation: {
      values: ["horizontal", "vertical"] satisfies Array<AlertProps["orientation"]>
    },
    actions: {
      type: "array",
      items: {
        type: "object",
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
      }
    }
  }
});

withDefaults(
  defineProps<{
    /** Callout title. */
    title?: string;
    /** The color tone of the callout. */
    color?: AlertProps["color"];
    /** The visual style variant of the callout. */
    variant?: AlertProps["variant"];
    /** Optional Iconify icon name. */
    icon?: string;
    /** The orientation of the callout. Determines the position of the actions. */
    orientation?: AlertProps["orientation"];
    /** Optional call-to-action buttons. */
    actions?: {
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
    }[];
  }>(),
  {
    color: "primary",
    variant: "soft",
    orientation: "vertical"
  }
);
</script>

<template>
  <UAlert v-bind="$props">
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
  </UAlert>
</template>
