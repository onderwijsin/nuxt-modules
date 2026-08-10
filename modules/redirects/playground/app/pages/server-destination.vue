<template>
  <UContainer class="py-10 sm:py-14 space-y-16">
    <UPageHeader
      title="Server redirect succeeded"
      description="Nitro server middleware handled this exact redirect before rendering the page."
    />

    <UCard>
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-success/10 size-12 grid place-items-center text-success">
          <UIcon name="i-lucide-check-circle-2" class="size-5" />
        </div>
        <div>
          <p class="font-semibold text-highlighted">Server middleware</p>
          <p class="mt-1 text-muted">
            The Nitro storage index resolved <code>/server-origin</code>.
          </p>
        </div>
      </div>
      <template #footer>
        <UButton to="/" color="neutral" variant="outline" leading-icon="i-lucide-arrow-left">
          Back to playground
        </UButton>
      </template>
    </UCard>
  </UContainer>
</template>
