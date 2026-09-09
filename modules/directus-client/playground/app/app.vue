<script setup lang="ts">
import { attempt } from "@onderwijsin/nuxt-module-utils";

const auth = useDirectusAuth();
const isAuthenticated = auth.isAuthenticated;
const router = useRouter();
const toast = useToast();
const logoutPending = shallowRef(false);

const navigationItems = computed(() => [
  {
    label: "Explore",
    icon: "i-lucide-compass",
    children: [
      {
        label: "Overview",
        description: "Read article IDs with the Directus client.",
        icon: "i-lucide-layout-dashboard",
        to: "/"
      },
      {
        label: "Versioned preview",
        description: "Inspect a versioned item lookup.",
        icon: "i-lucide-eye",
        to: "/preview"
      },
      {
        label: "Asset proxy",
        description: "Fetch an asset through the same-origin proxy.",
        icon: "i-lucide-image",
        to: "/assets"
      },
      {
        label: "Server request",
        description: "Run a Directus command from a Nitro route.",
        icon: "i-lucide-server",
        to: "/server"
      }
    ]
  },
  {
    label: "Authentication",
    icon: "i-lucide-shield-check",
    children: [
      ...(isAuthenticated.value
        ? [
            {
              label: "Current user",
              description: "View and refresh the authenticated Directus user.",
              icon: "i-lucide-user-round",
              to: "/user"
            }
          ]
        : [
            {
              label: "Login",
              description: "Start a cookie-backed Directus session.",
              icon: "i-lucide-log-in",
              to: "/login"
            }
          ]),
      {
        label: "Session",
        description: "Inspect the safe token-free session snapshot.",
        icon: "i-lucide-user-round-check",
        to: "/_session"
      },
      {
        label: "Sealed session",
        description: "Inspect the development-only encrypted cookie diagnostic.",
        icon: "i-lucide-key-round",
        to: "/session-inspection"
      }
    ]
  },
  {
    label: "Diagnostics",
    icon: "i-lucide-flask-conical",
    children: [
      {
        label: "Error handling",
        description: "Trigger and inspect normalized Directus failures.",
        icon: "i-lucide-triangle-alert",
        to: "/error"
      }
    ]
  }
]);

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
        <UNavigationMenu :items="navigationItems" content-orientation="vertical" />
        <UButton
          v-if="isAuthenticated"
          icon="i-lucide-log-out"
          label="Logout"
          color="neutral"
          variant="ghost"
          :loading="logoutPending"
          @click="logout"
        />
      </div>
    </template>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </PlaygroundAppShell>
</template>
