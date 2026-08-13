<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "static-text";
const { data } = await useFetch("/api/sanity/static-text");
</script>
