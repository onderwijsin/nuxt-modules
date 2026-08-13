<template>
  <p :data-sanity="layerName">{{ data }}</p>
</template>

<script setup lang="ts">
const layerName = "newsletter-signup";
const { data } = await useFetch("/api/sanity/newsletter-signup");
</script>
