<template>
  <div>
    <p :data-sanity="layerName">{{ data }}</p>
    <TailwindBreakpoint />
  </div>
</template>

<script setup lang="ts">
const layerName = "tailwind-breakpoint";
const { data } = await useFetch("/api/sanity/tailwind-breakpoint");
</script>
