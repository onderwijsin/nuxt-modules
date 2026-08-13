<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "redirects";
const { data } = await useFetch("/api/sanity/redirects");
</script>
