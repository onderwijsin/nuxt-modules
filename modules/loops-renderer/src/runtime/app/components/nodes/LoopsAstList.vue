<script setup lang="ts">
import { computed } from "#imports";
import { type LoopsLmxElement, type LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
  /** The ordered or unordered LMX list to render. */
  node: LoopsLmxElement;
  /** Contact fields available to child nodes that contain Loops merge tags. */
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
const style = useLoopsNodeStyles(
  () => props.node,
  () => props.config
);

/** Ignores LMX formatting whitespace while retaining only semantic list-item elements. */
const items = computed(() =>
  props.node.children.filter(
    (node): node is LoopsLmxElement => node.type === "element" && node.name === "ListItem"
  )
);

/** Uses the browser's native list markers for the two list variants emitted by Loops. */
const tag = computed(() => (props.node.name === "OrderedList" ? "ol" : "ul"));
</script>

<template>
  <component :is="tag" :style="style">
    <LoopsAstListItem
      v-for="(item, index) in items"
      :key="index"
      :node="item"
      :variables="variables"
      :config="config"
    />
  </component>
</template>
