<script setup lang="ts">
const { data } = await useAsyncData("preview-page", () =>
  useDirectusItemByPath("pages", { fields: ["id"] })
);
</script>

<template>
  <p data-testid="preview-title">{{ data?.id }}</p>
</template>
