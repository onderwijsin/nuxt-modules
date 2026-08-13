<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "directus-client";
const { data } = await useFetch("/api/sanity/directus-client");
</script>
