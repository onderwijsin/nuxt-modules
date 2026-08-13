<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "turnstile";
const { data } = await useFetch("/api/sanity/turnstile");
</script>
