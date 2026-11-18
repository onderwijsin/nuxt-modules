<script setup lang="ts">
import { defineEditorComponentSchema } from "../../utils/define-editor-component-schema";
import type { ItemListItem } from "../../../shared/types";

defineEditorComponentSchema({
  label: "Item list",
  type: "block",
  properties: {
    items: {
      items: {
        properties: {
          image: { input: "image" },
          to: { input: "url" },
          icon: { input: { type: "icon", collections: ["lucide"] } }
        }
      }
    }
  }
});

withDefaults(
  defineProps<{
    /** Whether to show dividers between items. */
    divide?: boolean;
    /** Items displayed as stacked page cards. */
    items: ItemListItem[];
  }>(),
  { divide: false }
);
</script>

<template>
  <UPageList as="ul" :divide="divide">
    <UPageCard
      v-for="(item, index) in items"
      :key="index"
      as="li"
      variant="ghost"
      :title="item.title"
      :description="item.description"
      :to="item.to"
      :external="!!item.to && item.external"
      :target="item.to && item.external ? '_blank' : undefined"
      :icon="item.image ? undefined : item.icon"
      :ui="{ wrapper: 'flex-row items-center gap-4', leading: 'mb-0' }"
    >
      <template v-if="item.image" #leading>
        <img :src="item.image" alt="" loading="lazy" class="size-12 rounded-md object-cover" />
      </template>
    </UPageCard>
  </UPageList>
</template>
