<script setup lang="ts">
import { useFetch } from "#app";
import { computed } from "vue";

import shiki from "@comark/nuxt/plugins/shiki";
import githubLight from "@shikijs/themes/github-light";
import githubDark from "@shikijs/themes/github-dark";

const plugins = [
  shiki({
    themes: { light: githubLight, dark: githubDark }
  })
];

const { data } = await useFetch("/api/markdown-renderer/components");

const markdown = computed(
  () => `
# Component metadata schema
\`\`\`json\n${JSON.stringify(data.value ?? [], null, 2)}\n\`\`\`
`
);
</script>

<template>
  <UContainer class="py-10">
    <MarkdownRenderer :value="markdown" :plugins="plugins" />
  </UContainer>
</template>
