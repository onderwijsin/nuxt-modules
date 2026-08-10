<script setup lang="ts">
const { data, error } = await useAsyncData("simulated-pages-preview", () =>
  useDirectusItemByPath("pages", {
    fields: ["id", "title"]
  })
);
</script>

<template>
  <div>
    <h1>Simulated Directus preview</h1>
    <p>Collection: pages · version: test · item ID: 1aefcdec-e02a-4193-b1dc-99cb7a85cfd4</p>
    <pre>{{ data }}</pre>
    <pre>{{ error }}</pre>
  </div>
</template>
