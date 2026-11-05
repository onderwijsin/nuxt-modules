<script setup lang="ts">
const pages = [
  { to: "/rendering", label: "01 · Normal rendering" },
  { to: "/color-mapping", label: "02 · Color mapping" },
  { to: "/approximation", label: "03 · Approximation" }
];
</script>

<template>
  <PlaygroundAppShell>
    <div class="space-y-8">
      <nav class="flex flex-wrap gap-2 border-b border-default pb-5" aria-label="Renderer examples">
        <NuxtLink
          v-for="page in pages"
          :key="page.to"
          :to="page.to"
          class="rounded-md px-4 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
          exact-active-class="bg-elevated text-highlighted"
          >{{ page.label }}</NuxtLink
        >
      </nav>
      <NuxtPage />
    </div>
  </PlaygroundAppShell>
</template>
