<script setup lang="ts">
const { isEnabled } = useTurnstile();
</script>

<template>
  <main>
    <p id="turnstile-enabled">{{ isEnabled }}</p>
  </main>
</template>
