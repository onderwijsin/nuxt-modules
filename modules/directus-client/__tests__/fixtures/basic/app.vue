<script setup lang="ts">
const { data: serverRenderedPages, error: serverRenderedError } = await useAsyncData(
  "directus-client-ssr",
  () => useDirectus(readItems("pages", { fields: ["id"], limit: 1 }))
);
</script>

<template>
  <main>
    <p data-testid="client-ssr-count">{{ serverRenderedPages?.length ?? 0 }}</p>
    <p data-testid="client-ssr-error">{{ serverRenderedError?.message ?? "" }}</p>
  </main>
</template>
