<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "healthcheck";
const { data } = await useFetch("/api/sanity/healthcheck");
</script>
