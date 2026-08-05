<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import { getLoopsLmxColumnsLayout } from "@onderwijsin/loops-core";
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

const props = defineProps<{
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

const columns = computed(() =>
  props.node.children.filter(
    (node): node is LoopsLmxElement => node.type === "element" && node.name === "ColumnItem"
  )
);
const columnsStyle = computed(() =>
  getLoopsLmxColumnsLayout(
    props.node.attributes.widths,
    props.node.attributes.gap,
    columns.value.length
  )
);
</script>

<template>
  <div
    v-if="node.name === 'Section'"
    :style="applyStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
  <div
    v-else-if="node.name === 'Columns' && columns.length"
    :style="{
      ...columnsStyle,
      ...applyStyles(node.attributes, config.applyInlineStyles !== false)
    }"
  >
    <LoopsAstNode
      v-for="(column, index) in columns"
      :key="index"
      :node="column"
      :variables="variables"
      :config="config"
    />
  </div>
  <div
    v-else-if="node.name === 'ColumnItem'"
    :style="applyStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
</template>
