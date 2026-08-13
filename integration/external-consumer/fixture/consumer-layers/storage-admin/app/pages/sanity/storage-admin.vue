<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "storage-admin";
const { data } = await useFetch("/api/sanity/storage-admin");
</script>
