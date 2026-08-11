<script setup lang="ts">
import { attempt } from "@onderwijsin/nuxt-module-utils";

const auth = useDirectusAuth();
const isAuthenticated = auth.isAuthenticated;
const router = useRouter();
const toast = useToast();
const logoutPending = shallowRef(false);

async function logout(): Promise<void> {
  logoutPending.value = true;
  try {
    const result = await attempt(async () => {
      await auth.logout();
      await router.push("/login");
    });
    if (result.error !== null) {
      const directusError = useDirectusError(result.error);
      toast.add({
        title: "Unable to sign out",
        description: directusError.errors[0]?.message ?? "The logout request failed.",
        color: "error"
      });
    }
  } finally {
    logoutPending.value = false;
  }
}
</script>

<template>
  <PlaygroundAppShell>
    <template #actions>
      <div class="flex items-center gap-1">
        <UButton
          to="/"
          icon="i-lucide-layout-dashboard"
          label="Overview"
          color="neutral"
          variant="ghost"
        />
        <UButton
          to="/preview"
          icon="i-lucide-eye"
          label="Preview"
          color="neutral"
          variant="ghost"
        />
        <UButton
          to="/error"
          icon="i-lucide-triangle-alert"
          label="Errors"
          color="neutral"
          variant="ghost"
        />
        <UButton
          v-if="!isAuthenticated"
          to="/login"
          icon="i-lucide-log-in"
          label="Login"
          color="neutral"
          variant="ghost"
        />
        <UButton
          v-else
          icon="i-lucide-log-out"
          label="Logout"
          color="neutral"
          variant="ghost"
          :loading="logoutPending"
          @click="logout"
        />
        <UButton
          to="/_session"
          icon="i-lucide-user-round"
          label="Session"
          color="neutral"
          variant="ghost"
        />
      </div>
    </template>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </PlaygroundAppShell>
</template>
