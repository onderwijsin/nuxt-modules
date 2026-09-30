<template>
  <div>
    <MarkdownRenderer />
    <p :data-sanity="layerName">{{ data }}</p>
  </div>
</template>

<script setup lang="ts">
const layerName = "markdown-renderer";
const { data } = await useFetch("/api/sanity/markdown-renderer");
</script>
