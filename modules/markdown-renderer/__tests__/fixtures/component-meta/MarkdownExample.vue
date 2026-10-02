<script setup lang="ts">
import { defineEditorComponentSchema } from "../../../src/runtime/app/utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Example",
  type: "block",
  properties: {
    actions: {
      items: {
        properties: {
          to: { input: "url" },
          icon: { input: { type: "icon", collections: ["lucide"] }, deprecated: true }
        }
      }
    }
  }
});
withDefaults(
  defineProps<{
    /** Optional actions. */
    actions?: {
      /** Action label. */
      label: string;
      /** Action destination. */
      to: string;
      /** Action icon. */
      icon?: string;
    }[];
    /** Example tone. */
    tone?: "primary" | "neutral";
  }>(),
  { tone: "primary" }
);
</script>

<template>
  <div><slot name="description" /></div>
</template>
