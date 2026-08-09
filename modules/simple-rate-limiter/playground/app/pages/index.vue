<template>
  <UContainer class="py-12">
    <div class="mx-auto max-w-4xl space-y-8">
      <UPageHeader
        title="Simple rate limiter playground"
        description="Exercise path-scoped and global per-IP limits with one request or concurrent bursts."
      />
      <RateLimitDemo />
    </div>
  </UContainer>
</template>
