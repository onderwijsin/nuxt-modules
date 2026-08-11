<script lang="ts" setup>
import * as Sentry from "@sentry/nuxt";
import { ref } from "vue";
import { useRuntimeConfig, useSeoMeta, useToast } from "#imports";

const title = "Sentry diagnostics";
const description = "Send controlled client and server errors to verify the Sentry integration.";
useSeoMeta({ title, description, ogTitle: title, ogDescription: description });

const toast = useToast();
const isTriggeringServerError = ref(false);
const sentry = useRuntimeConfig().public.sentry;
const sentryRuntime = sentry.runtime;
const serverEndpoint = sentry.testTools?.endpoint;
const runtimeLabel = sentryRuntime === "cloudflare_module" ? "Cloudflare Worker" : "Node server";
const runtimeDescription =
  sentryRuntime === "cloudflare_module"
    ? "Sentry is initialized through the Cloudflare Nitro plugin."
    : "Sentry is initialized through the generated Node server preload.";

/** Sends a controlled client-side exception to Sentry. */
function triggerClientError(): void {
  const eventId = Sentry.captureException(new Error("Sentry test client error"));
  toast.add({
    title: "Client error triggered",
    description: `Sentry event ID: ${eventId}`,
    color: "success"
  });
}

/** Calls the controlled server-error endpoint inside a frontend trace span. */
async function triggerServerError(): Promise<void> {
  if (!serverEndpoint) return;
  isTriggeringServerError.value = true;

  try {
    await Sentry.startSpan({ name: "Sentry test frontend span", op: "test" }, async () => {
      await $fetch(serverEndpoint, { retry: false });
    });
  } catch {
    toast.add({
      title: "Server error triggered",
      description: "The endpoint threw as expected. Check Sentry Issues and Traces.",
      color: "success"
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
        <UBadge :color="sentryRuntime === 'cloudflare_module' ? 'primary' : 'success'" size="lg">
          {{ runtimeLabel }}
        </UBadge>
      </div>
    </UCard>

    <UPageGrid class="grid-cols-1 pb-10 md:grid-cols-2 lg:grid-cols-2">
      <UPageCard
        title="Client error"
        description="Sends a test exception from the browser to Sentry."
      >
        <template #footer>
          <UButton
            label="Trigger client error"
            color="error"
            variant="soft"
            @click="triggerClientError"
          />
        </template>
      </UPageCard>

      <UPageCard
        title="Server error + trace"
        :description="
          serverEndpoint
            ? `Calls ${serverEndpoint}, which deliberately throws an error.`
            : 'The server test endpoint is disabled.'
        "
      >
        <template #footer>
          <UButton
            label="Trigger server error"
            color="warning"
            variant="soft"
            :loading="isTriggeringServerError"
            :disabled="isTriggeringServerError || !serverEndpoint"
            @click="triggerServerError"
          />
        </template>
      </UPageCard>
    </UPageGrid>
  </UContainer>
</template>
