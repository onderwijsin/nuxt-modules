<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "directus-config";
const { data } = await useFetch("/api/sanity/directus-config");
</script>
