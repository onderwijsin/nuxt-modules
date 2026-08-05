<script setup lang="ts">
import type { LoopsLmxElement } from "@onderwijsin/loops-core";
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

defineProps<{
  /** Raw LMX code content; merge tags intentionally remain literal inside code blocks. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
</script>

<template>
  <pre
    :style="applyStyles(node.attributes, config.applyInlineStyles !== false)"
  ><code><LoopsAstInline
    v-for="(child, index) in node.children"
    :key="index"
    :node="child"
    :variables="variables"
    :config="config"
    :resolve-variables="false"
  /></code></pre>
</template>
