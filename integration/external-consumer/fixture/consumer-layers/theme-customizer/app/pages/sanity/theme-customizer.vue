<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "theme-customizer";
const { data } = await useFetch("/api/sanity/theme-customizer");
</script>
