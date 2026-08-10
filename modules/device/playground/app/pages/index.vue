<script setup lang="ts">
const device = useDevice();
</script>

<template>
  <UPageHero
    title="Device flags"
    description="Inspect the SSR-aware device information exposed by the module."
  >
    <template #body>
      <UCard>
        <pre>{{ device }}</pre>
      </UCard>
    </template>
  </UPageHero>
</template>
