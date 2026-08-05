<script setup lang="ts">
import { computed } from "vue";
import {
  evaluate,
  applyInlineStyles,
  type LoopsLmxCondition,
  type LoopsLmxElement,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
/* removed duplicate type import */
/*
  LoopsLmxCondition,
  LoopsLmxElement,
  LoopsLmxVariables
*/
import type { LoopsRendererConfig } from "../../../../types";

const props = defineProps<{
  /** Section node whose optional conditional attributes control visibility. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

const condition = computed<LoopsLmxCondition | null>(() => {
  const variable = props.node.attributes.if;
  if (!variable) return null;

  const { ifOperation: operation, ifValue: value } = props.node.attributes;
  return {
    variable,
    ...(operation ? { operation: operation as LoopsLmxCondition["operation"] } : {}),
    ...(value !== undefined ? { value } : {})
  };
});

const isVisible = computed(
  () =>
    condition.value === null || evaluate(condition.value, props.variables, props.config.evaluate)
);
</script>

<template>
  <section
    v-if="isVisible"
    :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </section>
</template>
