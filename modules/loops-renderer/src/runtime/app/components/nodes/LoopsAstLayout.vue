<script setup lang="ts">
import { computed } from "#imports";
import {
  getLoopsLmxColumnsLayout,
  type LoopsLmxElement,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
const style = useLoopsNodeStyles(
  () => (props.node.name === "Section" ? undefined : props.node),
  () => props.config
);

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
  <LoopsAstSection
    v-if="node.name === 'Section'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <div
    v-else-if="node.name === 'Columns' && columns.length"
    :style="{
      ...columnsStyle,
      ...style
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
  <div v-else-if="node.name === 'ColumnItem'" :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
</template>
