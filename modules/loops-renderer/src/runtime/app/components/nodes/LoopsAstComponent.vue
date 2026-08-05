<script setup lang="ts">
import {
  applyInlineStyles,
  type LoopsLmxElement,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";

defineProps<{
  /** Component nodes contain already-expanded LMX children from the archival parser. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
</script>

<template>
  <div :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
</template>
