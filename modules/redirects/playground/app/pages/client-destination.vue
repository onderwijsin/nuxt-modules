<template>
  <UContainer class="py-10 sm:py-14 space-y-16">
    <UPageHeader
      title="Client redirect succeeded"
      description="Nuxt route middleware handled this exact redirect during client-side navigation."
    />

    <UCard>
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-success/10 size-12 grid place-items-center text-success">
          <UIcon name="i-lucide-check-circle-2" class="size-5" />
        </div>
        <div>
          <p class="font-semibold text-highlighted">Client middleware</p>
          <p class="mt-1 text-muted">
            The Pinia redirect store resolved <code>/client-origin</code>.
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
