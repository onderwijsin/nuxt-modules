<script setup lang="ts">
import { computed } from "vue";
import {
  isRenderableLoopsLmxElement,
  resolveSafeLoopsLmxUrl,
  applyInlineStyles,
  type LoopsLmxNode,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../../types";

const props = defineProps<{
  node: LoopsLmxNode;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
  resolveVariables?: boolean;
}>();

const isRenderable = computed(
  () =>
    props.node.type === "text" ||
    isRenderableLoopsLmxElement(props.node) ||
    (props.node.type === "element" && ["Quote", "Br"].includes(props.node.name))
);
const isInline = computed(
  () =>
    props.node.type === "text" ||
    ["Strong", "Em", "Underline", "Strike", "Code", "Text", "Link", "Br"].includes(props.node.name)
);
const isTextBlock = computed(
  () =>
    props.node.type === "element" &&
    ["H1", "H2", "H3", "Paragraph", "Quote"].includes(props.node.name)
);
const isMedia = computed(
  () => props.node.type === "element" && ["Image", "Divider"].includes(props.node.name)
);
const isList = computed(
  () => props.node.type === "element" && ["UnorderedList", "OrderedList"].includes(props.node.name)
);
const buttonLink = computed(() =>
  props.node.type === "element"
    ? resolveSafeLoopsLmxUrl(props.node.attributes.href, props.variables, "link")
    : null
);
</script>

<template>
  <LoopsAstInline
    v-if="isRenderable && isInline"
    :node="node"
    :variables="variables"
    :config="config"
    :resolve-variables="resolveVariables"
  />
  <LoopsAstTextBlock
    v-else-if="isRenderable && isTextBlock && node.type === 'element'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstMedia
    v-else-if="isRenderable && isMedia && node.type === 'element'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstList
    v-else-if="isRenderable && isList && node.type === 'element'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstComponent
    v-else-if="isRenderable && node.type === 'element' && node.name === 'Component'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstCodeBlock
    v-else-if="isRenderable && node.type === 'element' && node.name === 'CodeBlock'"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstIcons
    v-else-if="isRenderable && node.type === 'element' && ['Icons', 'Icon'].includes(node.name)"
    :node="node"
    :variables="variables"
    :config="config"
  />
  <LoopsAstLayout
    v-else-if="
      isRenderable &&
      node.type === 'element' &&
      ['Section', 'Columns', 'ColumnItem'].includes(node.name)
    "
    :node="node"
    :variables="variables"
    :config="config"
  />
  <UButton
    v-else-if="isRenderable && node.type === 'element' && node.name === 'Button' && buttonLink"
    :href="buttonLink"
    rel="noopener noreferrer"
    class="no-underline text-inverted"
    :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstInline
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </UButton>
  <span
    v-else-if="isRenderable && node.type === 'element' && node.name === 'Button'"
    :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
  >
    <LoopsAstInline
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
      :variables="variables"
      :config="config"
    />
  </span>
</template>
