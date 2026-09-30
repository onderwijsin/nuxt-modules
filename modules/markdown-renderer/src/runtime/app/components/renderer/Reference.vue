<script setup lang="ts">
import { computed } from "vue";

import resolveReferencePath from "#markdown-renderer/reference-resolver";

const props = defineProps<{
  /** Directus collection name. */
  collection: string;
  /** Referenced Directus item primary key. */
  item: string;
  /** Source display label. */
  label?: string;
  /** Author-controlled display text. */
  text?: string;
  /** Reference source snapshot. */
  data?: Record<string, unknown>;
}>();

const displayText = computed(() => props.text ?? props.label ?? "");
const path = computed(() =>
  resolveReferencePath(props.collection, props.item, props.label, props.text, props.data)
);
</script>

<template>
  <ULink v-if="path" :to="path">{{ displayText }}</ULink>
  <span v-else>{{ displayText }}</span>
</template>
