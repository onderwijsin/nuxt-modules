<script setup lang="ts">
const layerName = "ai-toolkit";
const { data } = await useFetch("/api/sanity/ai-toolkit");
</script>

<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>
