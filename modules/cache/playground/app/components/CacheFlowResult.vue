<script setup lang="ts">
defineProps<{
  article: { id: string; title: string; generatedAt: string } | null;
  cacheKey: string | null;
  metadata: Record<string, unknown> | null;
  cacheStatus: "hit" | "miss" | null;
  refreshedAt: string | null;
  errorMessage: string | null;
}>();
</script>

<template>
  <UAlert v-if="errorMessage" color="error" title="Cache flow failed" :description="errorMessage" />
  <UAlert
    v-else-if="!article"
    color="neutral"
    title="No cache entry loaded"
    description="Create an entry to simulate the first public request."
  />
  <UCard v-else>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-highlighted">{{ article.title }}</h2>
        <UBadge :color="cacheStatus === 'hit' ? 'success' : 'info'" variant="subtle">
          Cache {{ cacheStatus }}
        </UBadge>
      </div>
    </template>
    <dl class="grid gap-4 text-sm">
      <div class="grid gap-1">
        <dt class="text-muted">Cache key</dt>
        <dd class="text-default">
          <code>{{ cacheKey }}</code>
        </dd>
      </div>
      <div class="grid gap-1">
        <dt class="text-muted">Last refreshed</dt>
        <dd class="text-default">{{ refreshedAt }}</dd>
      </div>
    </dl>
    <USeparator class="my-6" />
    <div class="grid gap-2">
      <h3 class="font-medium text-highlighted">Cached value</h3>
      <pre
        class="overflow-auto rounded-md border border-muted bg-elevated p-4 text-sm text-default"
        >{{ JSON.stringify(article, null, 2) }}</pre>
    </div>
    <div class="mt-6 grid gap-2">
      <h3 class="font-medium text-highlighted">Cache metadata</h3>
      <pre
        class="overflow-auto rounded-md border border-muted bg-elevated p-4 text-sm text-default"
        >{{ JSON.stringify(metadata, null, 2) }}</pre>
    </div>
  </UCard>
</template>
