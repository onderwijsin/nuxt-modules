<script setup lang="ts">
const device = useDevice();
</script>

<template>
  <main>
    <h1>Device playground</h1>
    <pre>{{ device }}</pre>
  </main>
</template>
