<template>
  <div>
    <p :data-sanity="layerName">{{ data }}</p>
    <ClientOnly>
      <ThemeCustomizerThemePicker />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const layerName = "theme-customizer";
const { data } = await useFetch("/api/sanity/theme-customizer");
</script>
