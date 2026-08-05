<script setup lang="ts">
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

defineProps<{
  /** Component nodes contain already-expanded LMX children from the archival parser. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
</script>

<template>
  <div :style="applyStyles(node.attributes, config.applyInlineStyles !== false)">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </div>
</template>
