<script setup lang="ts">
import { useAsyncData } from "#imports";
import { useId } from "vue";
import { codeToHtml } from "shiki/bundle/web";

const props = defineProps<{ code: string; language: "json" | "markdown" }>();
const { data: html, error } = await useAsyncData(
  `document-code-${useId()}`,
  () =>
    codeToHtml(props.code, {
      lang: props.language,
      themes: { light: "github-light", dark: "github-dark" }
    }),
  { watch: [() => props.code] }
);
</script>

<template>
  <pre
    v-if="error || !html"
    class="overflow-x-auto rounded-lg bg-muted p-5 text-sm"
  ><code>{{ code }}</code></pre>
  <!-- Shiki escapes the source text; only its generated highlighting markup is rendered as HTML. -->
  <div
    v-else
    class="document-code overflow-hidden rounded-lg border border-default text-sm"
    v-html="html"
  />
</template>

<style scoped>
.document-code :deep(pre) {
  overflow-x: auto;
  padding: 1.25rem;
}

:global(.dark) .document-code :deep(.shiki),
:global(.dark) .document-code :deep(.shiki span) {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
</style>
