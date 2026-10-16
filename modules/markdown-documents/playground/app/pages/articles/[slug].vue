<script setup lang="ts">
import { createError, definePageMeta, useFetch, useRoute, useSeoMeta } from "#imports";

definePageMeta({ key: (route) => route.path });

const route = useRoute();
const { data: article, error } = await useFetch(
  () => `/api/articles/${encodeURIComponent(String(route.params.slug))}`
);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusCode === 404 ? "Article not found" : "Unable to load article"
  });
}

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: "Article not found" });
}

useSeoMeta({
  title: () => `${article.value?.title} · Markdown Documents`,
  description: () => article.value?.description
});
</script>

<template>
  <ArticleReader v-if="article" :article="article" />
</template>
