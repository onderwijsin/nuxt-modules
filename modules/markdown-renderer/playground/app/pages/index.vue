<script setup lang="ts">
const value = `# Markdown renderer

::Callout{title="Comark + Nuxt UI"}
Rendered from MDC.
::
`;
</script>

<template>
  <MarkdownRenderer component-set="demo" :value="value" />
</template>
