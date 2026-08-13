<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "cache";
const { data } = await useFetch("/api/sanity/cache");
</script>
