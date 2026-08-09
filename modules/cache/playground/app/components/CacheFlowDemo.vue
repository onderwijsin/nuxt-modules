<script setup lang="ts">
const {
  article,
  cacheKey,
  metadata,
  cacheStatus,
  refreshedAt,
  errorMessage,
  isCreating,
  isInvalidating,
  createCacheEntry,
  invalidateCacheEntry
} = useCacheFlow();
</script>

<template>
  <UCard class="max-w-2xl">
    <template #header>
      <p class="text-muted">
        Simulate a public route cache write, then a CMS webhook invalidation.
      </p>
    </template>
    <CacheFlowActions
      :is-creating="isCreating"
      :is-invalidating="isInvalidating"
      @create="createCacheEntry"
      @invalidate="invalidateCacheEntry"
    />
    <USeparator class="my-6" />
    <CacheFlowResult
      :article="article"
      :cache-key="cacheKey"
      :metadata="metadata"
      :cache-status="cacheStatus"
      :refreshed-at="refreshedAt"
      :error-message="errorMessage"
    />
  </UCard>
</template>
