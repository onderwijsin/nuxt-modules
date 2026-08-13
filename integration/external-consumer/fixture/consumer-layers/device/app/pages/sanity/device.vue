<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "device";
const { data } = await useFetch("/api/sanity/device");
</script>
