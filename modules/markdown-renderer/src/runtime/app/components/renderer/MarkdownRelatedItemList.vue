<script setup lang="ts">
import { computed } from "vue";

import mapItem from "#markdown-renderer/related-item-mapper";
import linkResolver from "#markdown-renderer/related-item-resolver";
import type { RelatedItem } from "../../../shared/types";
import { mapRelatedItems } from "../../utils/map-related-items";
import MarkdownItemList from "./MarkdownItemList.vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Ordered CMS selections with collection-specific source snapshots. */
  items: RelatedItem[];
}>();

const mappedItems = computed(() => mapRelatedItems(props.items, { mapItem, linkResolver }));
</script>

<template>
  <MarkdownItemList :items="mappedItems" />
</template>
