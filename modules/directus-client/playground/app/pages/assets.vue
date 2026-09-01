<script setup lang="ts">
const assetId = "006c90a4-c2f6-491b-9307-606ae2bf04bf";
const assetUrl = `/_directus/assets/${assetId}`;
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Directus asset proxy"
      description="Fetch a Directus asset through the dedicated same-origin assets proxy."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">Asset response</p>
            <h2 class="mt-1 text-xl font-semibold text-highlighted">Proxied asset</h2>
          </div>
          <UBadge color="success" variant="subtle">GET</UBadge>
        </div>
      </template>

      <div class="space-y-5">
        <div class="overflow-hidden rounded-lg bg-muted/30">
          <img
            :src="assetUrl"
            :alt="`Directus asset ${assetId}`"
            class="mx-auto max-h-[32rem] max-w-full object-contain"
            loading="eager"
          />
        </div>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted">Asset ID</dt>
            <dd class="mt-1 break-all font-mono text-sm text-highlighted">{{ assetId }}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Proxy URL</dt>
            <dd class="mt-1 break-all font-mono text-sm text-highlighted">{{ assetUrl }}</dd>
          </div>
        </dl>
      </div>
    </UCard>
  </UContainer>
</template>
