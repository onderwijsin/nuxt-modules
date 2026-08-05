<script setup lang="ts">
import { computed } from "vue";
import {
  getLoopsLmxImageWidth,
  resolveSafeLoopsLmxUrl,
  resolveLoopsLmxVariables,
  applyInlineStyles,
  type LoopsLmxElement,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../../types";

const props = defineProps<{
  node: LoopsLmxElement;
  variables: LoopsLmxVariables;
  config: LoopsRendererConfig;
}>();

const source = computed(() =>
  resolveSafeLoopsLmxUrl(
    props.node.attributes.dynamicSrc ?? props.node.attributes.src,
    props.variables,
    "image"
  )
);
const imageLink = computed(() =>
  resolveSafeLoopsLmxUrl(props.node.attributes.href, props.variables, "link")
);
const alt = computed(() =>
  resolveLoopsLmxVariables(props.node.attributes.alt ?? "", props.variables)
);
const width = computed(() => getLoopsLmxImageWidth(props.node.attributes.width));
</script>

<template>
  <hr
    v-if="node.name === 'Divider'"
    :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
  />
  <a v-else-if="source && imageLink" :href="imageLink" rel="noopener noreferrer">
    <img
      :src="source"
      :alt="alt"
      :width="width"
      loading="lazy"
      :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
    />
  </a>
  <img
    v-else-if="source"
    :src="source"
    :alt="alt"
    :width="width"
    loading="lazy"
    :style="applyInlineStyles(node.attributes, config.applyInlineStyles !== false)"
  />
</template>
