<script setup lang="ts">
const { data, error, refresh, pending } = await useFetch("/api/session-inspection");

async function refreshInspection(): Promise<void> {
  await refresh();
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Sealed session inspection"
      description="Development-only view of the encrypted cookie and its server-decrypted session data."
    />

    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-flask-conical"
      title="Playground diagnostic"
      description="This endpoint is for local development only. Secret masking is enabled by default and can be disabled in playground configuration."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Inspection failed"
      :description="error.message"
    />

    <UCard v-else>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="font-semibold text-highlighted">Session payload</h2>
            <p class="text-sm text-muted">Status: {{ data?.status ?? "Loading" }}</p>
          </div>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            @click="refreshInspection"
          />
        </div>
      </template>

      <div class="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 class="mb-2 font-medium text-highlighted">Encrypted cookie</h3>
          <pre class="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs break-all">{{
            JSON.stringify(data?.encrypted, null, 2)
          }}</pre>
        </div>
        <div>
          <h3 class="mb-2 font-medium text-highlighted">Decrypted session</h3>
          <pre class="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs break-all">{{
            JSON.stringify(data?.decrypted, null, 2)
          }}</pre>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
