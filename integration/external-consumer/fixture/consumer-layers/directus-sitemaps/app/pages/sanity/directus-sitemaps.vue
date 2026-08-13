<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "directus-sitemaps";
const { data } = await useFetch("/api/sanity/directus-sitemaps");
</script>
