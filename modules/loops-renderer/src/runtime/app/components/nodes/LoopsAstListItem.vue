<script setup lang="ts">
import type { LoopsLmxElement, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
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
  <li :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
      :resolve-variables="true"
    />
  </li>
</template>
