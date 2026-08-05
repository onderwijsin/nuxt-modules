<script setup lang="ts">
import { computed, useAppConfig } from "#imports";
import {
  loopsLmxAstSchema,
  getUnsupportedLoopsLmxNodes,
  hasRenderableLoopsLmxNodes,
  hasUnsupportedLoopsLmxNodes,
  type LoopsLmxAst,
  type LoopsLmxVariables
} from "@onderwijsin/loops-core";
import type { LoopsRendererConfig } from "../../types";
import { createLoopsRendererConfig } from "../utils/renderer";

const props = defineProps<{
  /** Parsed LMX component tree received from the public campaign-detail API. */
  data: LoopsLmxAst;
  variables: LoopsLmxVariables;
  config?: LoopsRendererConfig;
}>();

const appConfig = useAppConfig() as { loopsRenderer?: LoopsRendererConfig };

const rendererConfig = computed(() =>
  createLoopsRendererConfig(props.config, appConfig.loopsRenderer)
);

// Persisted campaign content is untrusted JSON at this client boundary.
const parsedContent = computed(() => loopsLmxAstSchema.safeParse(props.data));
const ast = computed(() => (parsedContent.value.success ? parsedContent.value.data : null));

const hasRenderableContent = computed(
  () => ast.value !== null && hasRenderableLoopsLmxNodes(ast.value.children)
);
const hasUnsupportedContent = computed(
  () => ast.value !== null && hasUnsupportedLoopsLmxNodes(ast.value.children)
);
const unsupportedNodes = computed(() =>
  ast.value === null ? [] : getUnsupportedLoopsLmxNodes(ast.value.children)
);
</script>

<template>
  <div v-if="hasRenderableContent && ast" class="prose dark:prose-invert campaign-renderer">
    <LoopsAstNode
      v-for="(node, index) in ast.children"
      :key="index"
      :node="node"
      :variables="variables"
      :config="rendererConfig"
    />
  </div>
  <DevOnly v-if="config?.debug">
    <LoopsAstUnsupportedNodes
      v-if="hasUnsupportedContent"
      :nodes="unsupportedNodes"
      :config="rendererConfig"
    />
  </DevOnly>
</template>

<style lang="postcss">
/* Remove margin top on first element */
.campaign-renderer > *:first-child {
  margin-top: 0;
  & > *:first-child {
    margin-top: 0;
  }
}
</style>
