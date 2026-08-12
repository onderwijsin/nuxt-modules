<script setup lang="ts">
import clientConfig from "#directus-config";
const { data: serverConfig } = await useFetch("/api/config");
</script>

<template>
  <div class="space-y-8">
    <UPageHeader
      title="Directus configuration"
      description="Compare the client-safe projection with the complete server-side configuration."
    >
      <template #headline>
        <UBadge color="primary" variant="subtle" icon="i-lucide-settings-2">
          Runtime configuration
        </UBadge>
      </template>
    </UPageHeader>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Sensitive values stay server-side"
      description="The client object is generated from the public schema. The server object is only fetched through a server API route."
    />

    <div class="grid gap-6 xl:grid-cols-2">
      <UCard class="overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="grid size-11 place-items-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-monitor" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">Client-safe config</h2>
                <p class="mt-1 text-sm text-muted">Available to browser-side code.</p>
              </div>
            </div>
            <UBadge color="success" variant="subtle">Public</UBadge>
          </div>
        </template>

        <pre
          class="max-h-[32rem] overflow-auto rounded-xl bg-inverted p-5 text-sm leading-6 text-inverted"
        ><code>{{ JSON.stringify(clientConfig, null, 2) }}</code></pre>
      </UCard>

      <UCard class="overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="grid size-11 place-items-center rounded-xl bg-warning/10 text-warning">
                <UIcon name="i-lucide-server" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">Full server config</h2>
                <p class="mt-1 text-sm text-muted">Resolved inside the Nitro server.</p>
              </div>
            </div>
            <UBadge color="warning" variant="subtle">Private</UBadge>
          </div>
        </template>

        <pre
          class="max-h-[32rem] overflow-auto rounded-xl bg-inverted p-5 text-sm leading-6 text-inverted"
        ><code>{{ JSON.stringify(serverConfig, null, 2) }}</code></pre>
      </UCard>
    </div>
  </div>
</template>
