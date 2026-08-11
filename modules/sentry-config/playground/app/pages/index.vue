<script lang="ts" setup>
import * as Sentry from "@sentry/nuxt";

const ICONS = {
  success: "heroicons:check-circle-20-solid",
  error: "heroicons:exclamation-triangle-20-solid",
  warn: "heroicons:exclamation-circle-20-solid"
};

const title = "Sentry playground";
const description =
  "Send client and server errors to Sentry and check if the auto-generated config is working.";
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
});

const toast = useToast();
const isTriggeringServerError = ref(false);
const sentryRuntime = useRuntimeConfig().public.sentry.runtime;
const runtimeLabel = sentryRuntime === "cloudflare_module" ? "Cloudflare Worker" : "Node server";
const runtimeIcon = sentryRuntime === "cloudflare_module" ? "i-lucide-cloud" : "i-lucide-server";
const runtimeDescription =
  sentryRuntime === "cloudflare_module"
    ? "Sentry is initialized through the Cloudflare Nitro plugin."
    : "Sentry is initialized through the generated Node server preload.";

/**
 * Sends a controlled client-side exception to Sentry.
 *
 * @returns Nothing.
 */
function triggerClientError(): void {
  const error = new Error("Sentry test client error");
  const eventId = Sentry.captureException(error);

  toast.add({
    title: "Client error triggered",
    description: `Sentry event-id: ${eventId}`,
    color: "success",
    icon: ICONS.success
  });
}

/**
 * Triggers the server test endpoint inside a traced frontend span.
 *
 * @returns Nothing.
 */
async function triggerServerError(): Promise<void> {
  isTriggeringServerError.value = true;

  try {
    await Sentry.startSpan(
      {
        name: "Sentry test frontend span",
        op: "test"
      },
      async () => {
        await $fetch("/api/_sentry/trigger-error", { retry: false });
      }
    );
  } catch (error) {
    console.error("Sentry test server request failed as expected", error);
    toast.add({
      title: "Server error triggered",
      description: "The test error has been executed. Check Sentry Issues and Traces.",
      color: "success",
      icon: ICONS.success
    });
  } finally {
    isTriggeringServerError.value = false;
  }
}
</script>

<template>
  <UContainer>
    <UPageHero
      headline="Observability"
      :title="title"
      :description="description"
      :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
    />

    <UCard class="mb-8 overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
      <div
        class="flex flex-col gap-4 bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-medium text-muted">Active Sentry server runtime</p>
          <p class="mt-1 text-base text-highlighted">{{ runtimeDescription }}</p>
        </div>
        <UBadge
          :color="sentryRuntime === 'cloudflare_module' ? 'primary' : 'success'"
          :icon="runtimeIcon"
          size="lg"
          variant="solid"
        >
          {{ runtimeLabel }}
        </UBadge>
      </div>
    </UCard>

    <UPageGrid class="grid-cols-1 pb-10 md:grid-cols-2 lg:grid-cols-2">
      <UPageCard
        title="Client error"
        description="Sends a test exception from the browser to Sentry."
        :icon="ICONS.error"
        :ui="{ description: 'text-base' }"
      >
        <template #footer>
          <UButton
            label="Trigger client error"
            color="error"
            variant="soft"
            :icon="ICONS.error"
            @click="triggerClientError"
          />
        </template>
      </UPageCard>

      <UPageCard
        title="Server error + trace"
        description="Starts a frontend span and calls the endpoint `/api/_sentry/trigger-error` which deliberately throws an error."
        :icon="ICONS.warn"
        :ui="{ description: 'text-base' }"
      >
        <template #footer>
          <UButton
            label="Trigger server error"
            color="warning"
            variant="soft"
            :loading="isTriggeringServerError"
            :disabled="isTriggeringServerError"
            :icon="ICONS.warn"
            @click="triggerServerError"
          />
        </template>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>
