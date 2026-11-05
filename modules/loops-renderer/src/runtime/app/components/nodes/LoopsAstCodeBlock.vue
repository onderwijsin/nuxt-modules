<script setup lang="ts">
import { type LoopsLmxElement, type LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
  /** Raw LMX code content; merge tags intentionally remain literal inside code blocks. */
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
  <pre :style="style"><code><LoopsAstInline
    v-for="(child, index) in node.children"
    :key="index"
    :node="child"
    :variables="variables"
    :config="config"
    :resolve-variables="false"
  /></code></pre>
</template>
