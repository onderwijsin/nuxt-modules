<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "sentry-config";
const { data } = await useFetch("/api/sanity/sentry-config");
</script>
