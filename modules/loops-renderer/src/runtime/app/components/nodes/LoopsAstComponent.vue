<script setup lang="ts">
import { type LoopsLmxElement, type LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
  /** Component nodes contain already-expanded LMX children from the archival parser. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
const style = useLoopsNodeStyles(
  () => props.node,
  () => props.config
);
</script>

<template>
  <div :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
</template>
