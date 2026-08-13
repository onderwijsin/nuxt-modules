<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "ui-form-extensions";
const { data } = await useFetch("/api/sanity/ui-form-extensions");
</script>
