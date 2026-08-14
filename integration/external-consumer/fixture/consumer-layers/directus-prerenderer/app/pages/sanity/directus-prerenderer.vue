<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "directus-prerenderer";
const { data } = await useFetch("/api/sanity/directus-prerenderer");
</script>
