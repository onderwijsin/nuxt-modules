<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

const props = defineProps<{
  /** The ordered or unordered LMX list to render. */
  node: LoopsLmxElement;
  /** Contact fields available to child nodes that contain Loops merge tags. */
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

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
  <component :is="tag" :style="applyStyles(node.attributes, config.applyInlineStyles !== false)">
    <li
      v-for="(item, index) in items"
      :key="index"
      :style="applyStyles(item.attributes, config.applyInlineStyles !== false)"
    >
      <LoopsAstNode
        v-for="(child, childIndex) in item.children"
        :key="childIndex"
        :node="child"
        :variables="variables"
        :config="config"
        :resolve-variables="true"
      />
    </li>
  </component>
</template>
