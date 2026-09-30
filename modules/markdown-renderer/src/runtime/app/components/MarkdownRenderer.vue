<script setup lang="ts">
import { computed } from "vue";

import { resolveRendererComponent } from "#markdown-renderer/manifest";

const props = defineProps<{
  /** Markdown or MDC source rendered by Comark. */
  value?: string;
  /** Optional configured component set that constrains custom components. */
  componentSet?: string;
}>();

const componentsManifest = computed(
  () => (name: string) => resolveRendererComponent(name, props.componentSet)
);
</script>

<template>
  <Markdown :value="value" :components-manifest="componentsManifest" />
</template>
