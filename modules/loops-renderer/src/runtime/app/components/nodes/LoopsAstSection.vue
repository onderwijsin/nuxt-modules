<script setup lang="ts">
import { computed } from "#imports";
import {
  evaluate,
  type LoopsLmxCondition,
  type LoopsLmxElement,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";
import { useLoopsNodeStyles } from "../../composables/node-styles";

const props = defineProps<{
  /** Section node whose optional conditional attributes control visibility. */
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();
const style = useLoopsNodeStyles(
  () => props.node,
  () => props.config
);

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
  <section v-if="isVisible" :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </section>
</template>
