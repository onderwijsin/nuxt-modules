<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

defineEditorComponentSchema({
  label: "Hero",
  description: "A consumer-defined page introduction.",
  type: "block",
  properties: {
    align: { values: ["left", "center"] },
    actionTo: { input: "url" }
  }
});

defineProps<{
  /** Main hero heading. */
  title: string;
  /** Horizontal content alignment. */
  align?: "left" | "center";
  /** Optional call-to-action destination. */
  actionTo?: string;
}>();
</script>

<template>
  <section>
    <h1>{{ title }}</h1>
    <slot />
  </section>
</template>
