<script setup lang="ts">
definePageMeta({ middleware: "authenticated" });

const { user, status, error, refresh } = useDirectusUser();
const formattedUser = computed(() => (user.value ? JSON.stringify(user.value, null, 2) : null));
const userStatus = computed(() => {
  if (status.value === "pending") return { label: "Loading", color: "warning" as const };
  if (error.value) return { label: "Unavailable", color: "error" as const };
  return { label: "Loaded", color: "success" as const };
});

/** Refreshes the current-user projection without rotating the authentication session. */
async function refreshUser(): Promise<void> {
  await refresh();
}
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Current Directus user"
      description="View the optional current-user projection separately from the token-free session snapshot."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-user-round-check" class="size-5 text-primary" />
            <div>
              <h2 class="font-semibold text-highlighted">User projection</h2>
              <p class="text-sm text-muted">Returned by <code>useDirectusUser()</code></p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <UBadge :color="userStatus.color" variant="subtle">{{ userStatus.label }}</UBadge>
            <UButton
              label="Refresh user"
              icon="i-lucide-refresh-cw"
              :loading="status === 'pending'"
              @click="refreshUser"
            />
          </div>
        </div>
      </template>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="User request failed"
        :description="error.message"
      />
      <div v-else-if="formattedUser" class="space-y-4">
        <UAlert
          color="success"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Authenticated user data"
          description="This projection contains configured Directus user fields; authentication tokens remain server-only."
        />
        <pre class="overflow-auto rounded-lg bg-muted/30 p-4 text-sm text-highlighted">{{
          formattedUser
        }}</pre>
      </div>
      <div v-else class="rounded-lg bg-muted/30 p-4 text-sm text-muted">
        Loading the current Directus user…
      </div>
    </UCard>
  </UContainer>
</template>
