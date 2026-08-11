<script setup lang="ts">
const sitemapUrl = "/sitemap_index.xml";
</script>

<template>
  <section>
    <h1>Directus Sitemaps</h1>
    <p>
      Configure Directus collections in <code>directus.config.ts</code> to generate sitemap sources.
    </p>
    <NuxtLink :to="sitemapUrl">Open sitemap index</NuxtLink>
  </section>
</template>
