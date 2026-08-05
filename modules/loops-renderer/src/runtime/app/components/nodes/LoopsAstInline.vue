<script setup lang="ts">
import { computed } from "vue";
import {
  resolveSafeLoopsLmxUrl,
  resolveLoopsLmxVariables,
  applyInlineStyles,
  type LoopsLmxNode,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";

const props = defineProps<{
  node: LoopsLmxNode;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
  /** Code blocks treat merge tags literally, as required by the LMX specification. */
  resolveVariables?: boolean;
}>();

const resolvedText = computed(() =>
  props.node.type === "text"
    ? props.resolveVariables === false
      ? props.node.value
      : resolveLoopsLmxVariables(props.node.value, props.variables)
    : ""
);
const link = computed(() =>
  props.node.type === "element"
    ? resolveSafeLoopsLmxUrl(props.node.attributes.href, props.variables, "link")
    : null
);
const inlineTag = computed(() => {
  if (props.node.type !== "element") return null;
  return (
    {
      Strong: "strong",
      Em: "em",
      Underline: "u",
      Strike: "s",
      Code: "code",
      Text: "span"
    } as const
  )[props.node.name as "Strong" | "Em" | "Underline" | "Code"];
});
const style = computed(() =>
  applyInlineStyles(
    props.node.type === "element" ? props.node.attributes : {},
    props.config.applyInlineStyles !== false
  )
);
</script>

<template>
  <template v-if="node.type === 'text'">{{ resolvedText }}</template>
  <br v-else-if="node.type === 'element' && node.name === 'Br'" />
  <a v-else-if="node.name === 'Link' && link" :href="link" rel="noopener noreferrer" :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
      :resolve-variables="resolveVariables"
    />
  </a>
  <component v-else-if="inlineTag" :is="inlineTag" :style="style">
    <LoopsAstNode
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
      :resolve-variables="resolveVariables"
    />
  </component>
</template>
