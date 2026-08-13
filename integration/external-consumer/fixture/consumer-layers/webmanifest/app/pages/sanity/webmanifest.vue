<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "webmanifest";
const { data } = await useFetch("/api/sanity/webmanifest");
</script>
