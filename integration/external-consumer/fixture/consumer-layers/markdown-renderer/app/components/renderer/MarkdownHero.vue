<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

/** Consumer page introduction. */
defineProps<{ title: string; videoSrc?: string }>();
defineEditorComponentSchema({
  label: "Hero",
  type: "block",
  properties: { videoSrc: { label: "My Video", input: "video" } }
});
</script>

<template>
  <h2>{{ title }}</h2>
</template>
