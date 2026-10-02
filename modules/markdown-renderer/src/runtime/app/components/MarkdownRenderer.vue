<script setup lang="ts">
import { computed } from "vue";
import type { ComarkPlugin } from "comark";
import { useAppConfig } from "#app";

import { resolveRendererComponent } from "#markdown-renderer/manifest";

const props = defineProps<{
  /** Markdown or MDC source rendered by Comark. */
  value?: string;
  /** Optional configured component set that constrains custom components. */
  componentSet?: string;
  /** Optional array of plugins to enhance the Markdown rendering. */
  plugins?: ComarkPlugin[];
}>();

const config = useAppConfig().markdownRenderer;

const componentsManifest = computed(
  () => (name: string) => resolveRendererComponent(name, props.componentSet)
);

const extendedPlugins: ComarkPlugin[] = [];

if (config.videoBaseUrl) {
  const { videoSourcePlugin } = await import("../comark-plugins/video-source");
  extendedPlugins.push(videoSourcePlugin());
}

const lazilyExtendedPlugins = computed<ComarkPlugin[]>(() => [
  ...(props.plugins ?? []),
  ...extendedPlugins
]);
</script>

<template>
  <Markdown
    :value="value"
    :components-manifest="componentsManifest"
    :plugins="lazilyExtendedPlugins"
  />
</template>

<style lang="postcss">
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
</style>
