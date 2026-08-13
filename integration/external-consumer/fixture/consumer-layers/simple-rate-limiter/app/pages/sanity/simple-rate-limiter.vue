<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "simple-rate-limiter";
const { data } = await useFetch("/api/sanity/simple-rate-limiter");
</script>
