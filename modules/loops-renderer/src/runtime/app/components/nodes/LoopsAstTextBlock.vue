<script setup lang="ts">
import { computed } from "vue";
import type { LoopsLmxElement, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";
import { applyStyles } from "../../../../utils/applyStyles";

const props = defineProps<{
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

const tag = computed(() => {
  const tags = {
    H1: "h1",
    H2: "h2",
    H3: "h3",
    Paragraph: "p",
    Quote: "blockquote"
  } as const;
  return tags[props.node.name as keyof typeof tags];
});
/** LMX alignment maps to the two local prose utility exceptions requested by the archive UI. */
const alignmentClass = computed(() => {
  if (props.node.attributes.align === "center") return "text-center";
  if (props.node.attributes.align === "right") return "text-right";
  return undefined;
});
</script>

<template>
  <component
    v-if="tag"
    :is="tag"
    :class="alignmentClass"
    :style="applyStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
      :resolve-variables="true"
    />
  </component>
</template>
