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
  /** Iconify icon as collection:name. */
  icon?: string;
  /** Reference source snapshot. */
  data?: Record<string, unknown>;
}>();

const displayText = computed(() => props.text ?? props.label ?? "");
const path = computed(() =>
  resolveReferencePath(props.collection, props.item, props.label, props.text, props.data)
);
</script>

<template>
  <ULink v-if="path" variant="link" :to="path" :icon="icon" class="text-primary underline">
    <UIcon v-if="icon" :name="icon" class="mr-1 align-[-0.125em]" />
    <span>{{ displayText }}</span>
  </ULink>
  <span v-else>{{ displayText }}</span>
</template>
