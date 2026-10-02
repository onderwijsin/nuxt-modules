<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

/** Consumer page introduction. */
defineProps<{ title: string }>();
defineEditorComponentSchema({ label: "Hero", type: "block" });
</script>

<template>
  <h2>{{ title }}</h2>
</template>
