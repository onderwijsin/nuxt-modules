<script lang="ts" setup>
const { lastRun, limit, pending, runRequests, windowSeconds } = useRateLimitDemo();

const scenarios = [
  {
    count: 1,
    label: "Send 1 request",
    description: "A single request should pass."
  },
  {
    count: 5,
    label: "Send 5 concurrent requests",
    description: "The complete one-second allowance should pass."
  },
  {
    count: 10,
    label: "Send 10 concurrent requests",
    description: "The remaining requests should receive a friendly 429 toast."
  }
];
</script>

<template>
  <div class="space-y-6">
    <UAlert
      color="info"
      icon="i-lucide-info"
      title="A deliberately small limit"
      :description="`Both the /api middleware and the endpoint allow ${limit} requests per ${windowSeconds}-second window per IP.`"
    />

    <div class="grid gap-4 md:grid-cols-3">
      <UCard v-for="scenario in scenarios" :key="scenario.count">
        <div class="flex h-full flex-col gap-4">
          <div class="space-y-2">
            <UBadge color="neutral" variant="subtle"
              >{{ scenario.count }} request{{ scenario.count === 1 ? "" : "s" }}</UBadge
            >
            <h2 class="text-lg font-semibold text-highlighted">{{ scenario.label }}</h2>
            <p class="text-sm text-muted">{{ scenario.description }}</p>
          </div>
          <UButton
            class="mt-auto"
            block
            :loading="pending === scenario.count"
            :disabled="pending !== null"
            :label="scenario.label"
            :icon="scenario.count === 1 ? 'i-lucide-send' : 'i-lucide-zap'"
            @click="runRequests(scenario.count)"
          />
        </div>
      </UCard>
    </div>

    <UCard v-if="lastRun.length > 0" :ui="{ body: 'space-y-3' }">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h2 class="font-semibold text-highlighted">Last run</h2>
          <UBadge color="neutral" variant="subtle">{{ lastRun.length }} responses</UBadge>
        </div>
      </template>
      <div class="flex flex-wrap gap-2" aria-live="polite">
        <UBadge
          v-for="(result, index) in lastRun"
          :key="index"
          :color="result.status === 'allowed' ? 'success' : 'error'"
          variant="subtle"
        >
          {{ result.status === "allowed" ? "Allowed" : "429 Too Many Requests" }}
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
