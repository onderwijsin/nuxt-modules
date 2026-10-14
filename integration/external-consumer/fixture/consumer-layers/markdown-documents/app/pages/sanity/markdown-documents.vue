<script setup lang="ts">
const layerName = "markdown-documents";
const { data } = await useFetch("/api/sanity/markdown-documents");
</script>

<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>
