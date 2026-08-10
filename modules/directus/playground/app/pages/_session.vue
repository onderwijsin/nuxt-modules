<script setup lang="ts">
const auth = useDirectusAuth();
const toast = useToast();
const loading = shallowRef(false);
const logoutPending = shallowRef(false);

async function refreshSession(): Promise<void> {
  loading.value = true;
  try {
    await auth.refresh();
  } catch (cause) {
    const directusError = useDirectusError(cause);
    toast.add({
      title: "Session refresh failed",
      description: directusError.errors[0]?.message ?? "The session could not be refreshed.",
      color: "error"
    });
  } finally {
    loading.value = false;
  }
}

async function logout(): Promise<void> {
  logoutPending.value = true;
  try {
    await auth.logout();
  } catch (cause) {
    const directusError = useDirectusError(cause);
    toast.add({
      title: "Unable to sign out",
      description: directusError.errors[0]?.message ?? "The logout request failed.",
      color: "error"
    });
  } finally {
    logoutPending.value = false;
  }
}

const session = auth._session;
</script>

<template>
  <UContainer class="space-y-8 py-8">
    <UPageHeader
      title="Current session"
      description="Inspect the safe session snapshot persisted by the Directus module."
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-user-round-check" class="size-5 text-primary" />
            <h2 class="font-semibold text-highlighted">Session state</h2>
          </div>
          <UBadge :color="loading ? 'warning' : session ? 'success' : 'neutral'" variant="subtle">
            {{ loading ? "Loading" : session ? "Authenticated" : "Signed out" }}
          </UBadge>
        </div>
      </template>

      <UAlert
        v-if="!session && !loading"
        color="neutral"
        variant="soft"
        icon="i-lucide-log-in"
        title="No active session"
        description="Sign in to test cookie persistence and authenticated Directus requests."
        :actions="[{ label: 'Open login', to: '/login', color: 'primary' }]"
      />
      <div v-else-if="session" class="space-y-5">
        <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-muted/30 p-4">
            <dt class="text-xs font-medium uppercase tracking-wide text-muted">User ID</dt>
            <dd class="mt-1 break-all font-mono text-sm text-highlighted">{{ session.userId }}</dd>
          </div>
          <div class="rounded-lg bg-muted/30 p-4">
            <dt class="text-xs font-medium uppercase tracking-wide text-muted">Email</dt>
            <dd class="mt-1 text-sm text-highlighted">{{ session.email ?? "Not returned" }}</dd>
          </div>
        </dl>

        <UAlert
          color="success"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Token-free state"
          description="This page receives the safe snapshot only. Neither Directus token is rendered or exposed to application code."
        />

        <div class="flex flex-wrap gap-3">
          <UButton
            label="Refresh session"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            :disabled="logoutPending"
            @click="refreshSession"
          />
          <UButton
            label="Sign out"
            icon="i-lucide-log-out"
            color="neutral"
            variant="outline"
            :loading="logoutPending"
            :disabled="loading"
            @click="logout"
          />
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
