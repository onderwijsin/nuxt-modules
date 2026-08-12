<script setup lang="ts">
interface ArticlePreview {
  id: string;
}

const { data, error, status } = await useFetch<ArticlePreview[]>("/api/directus-server");

const response = computed(() => (data.value ? JSON.stringify(data.value, null, 2) : ""));
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Server request"
      description="Inspect a Directus request made with useDirectusServer in a Nitro route."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">Server route response</p>
            <h2 class="mt-1 text-xl font-semibold text-highlighted">Read article IDs</h2>
          </div>
          <UBadge
            :color="error ? 'error' : status === 'pending' ? 'warning' : 'success'"
            variant="subtle"
          >
            {{ error ? "Failed" : status === "pending" ? "Loading" : "Loaded" }}
          </UBadge>
        </div>
      </template>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="The server request could not be completed"
        description="Check the Directus URL and credentials configured for the playground."
      />
      <pre v-else class="overflow-auto rounded-lg bg-muted/30 p-4 text-sm text-muted">{{
        response
      }}</pre>
    </UCard>
  </UContainer>
</template>
