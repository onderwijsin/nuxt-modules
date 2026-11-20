<script setup lang="ts">
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";

defineEditorComponentSchema({
  label: "Anchor",
  description: "Add a link target for jumping to this spot on the page.",
  type: "block"
});

defineProps<{
  /** Fragment identifier targeted by anchor links. */
  id: string;
}>();
</script>

<template>
  <span :id="id" class="markdown-anchor" />
</template>
