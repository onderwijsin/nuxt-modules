<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "loops-renderer";
const { data } = await useFetch("/api/sanity/loops-renderer");
</script>
