<script setup lang="ts">
import { attempt } from "@onderwijsin/nuxt-module-utils";

const toast = useToast();

type DirectusErrorFlag =
  | "isNitroError"
  | "isInvalidAuthInput"
  | "isInvalidEmailInput"
  | "isInvalidPasswordInput"
  | "isInvalidOtpInput"
  | "isInvalidPasswordResetTokenInput"
  | "isOtpError"
  | "isInvalidCredentialError"
  | "isForbiddenError"
  | "isTokenExpiredError"
  | "isInvalidTokenError"
  | "isValidationError"
  | "isRateLimitError"
  | "isServiceUnavailableError"
  | "isRouteNotFoundError";

const scenarios = [
  {
    key: "nitroEmail",
    title: "Invalid email input",
    description: "A local Nitro validator rejected the email format.",
    flag: "isInvalidEmailInput",
    icon: "i-lucide-at-sign"
  },
  {
    key: "nitroPassword",
    title: "Invalid password input",
    description: "A local Nitro validator rejected an oversized password.",
    flag: "isInvalidPasswordInput",
    icon: "i-lucide-key-round"
  },
  {
    key: "nitroOtp",
    title: "Invalid OTP input",
    description: "A local Nitro validator rejected an oversized OTP.",
    flag: "isInvalidOtpInput",
    icon: "i-lucide-scan-line"
  },
  {
    key: "nitroResetToken",
    title: "Invalid reset token input",
    description: "A local Nitro validator rejected an oversized reset token.",
    flag: "isInvalidPasswordResetTokenInput",
    icon: "i-lucide-key-square"
  },
  {
    key: "otp",
    title: "Invalid one-time password",
    description: "The supplied one-time password is incorrect.",
    flag: "isOtpError",
    icon: "i-lucide-key-round"
  },
  {
    key: "invalidCredentials",
    title: "Invalid credentials",
    description: "Authentication failed because the supplied credentials are invalid.",
    flag: "isInvalidCredentialError",
    icon: "i-lucide-user-round-x"
  },
  {
    key: "forbidden",
    title: "Forbidden",
    description: "The current user does not have permission to access a resource.",
    flag: "isForbiddenError",
    icon: "i-lucide-shield-x"
  },
  {
    key: "tokenExpired",
    title: "Expired token",
    description: "The access token is valid but has expired and needs refreshing.",
    flag: "isTokenExpiredError",
    icon: "i-lucide-clock-3"
  },
  {
    key: "invalidToken",
    title: "Invalid token",
    description: "The access token is malformed or invalid.",
    flag: "isInvalidTokenError",
    icon: "i-lucide-badge-x"
  },
  {
    key: "validation",
    title: "Validation failure",
    description: "A submitted field value does not satisfy the collection validation rules.",
    flag: "isValidationError",
    icon: "i-lucide-list-checks"
  },
  {
    key: "rateLimited",
    title: "Rate limited",
    description: "The request limit was exceeded and the client should back off.",
    flag: "isRateLimitError",
    icon: "i-lucide-gauge"
  },
  {
    key: "unavailable",
    title: "Service unavailable",
    description: "Directus or one of its dependencies is temporarily unavailable.",
    flag: "isServiceUnavailableError",
    icon: "i-lucide-server-crash"
  },
  {
    key: "routeNotFound",
    title: "Route not found",
    description: "The requested Directus endpoint does not exist.",
    flag: "isRouteNotFoundError",
    icon: "i-lucide-route-off"
  }
] as const satisfies readonly {
  key: string;
  title: string;
  description: string;
  flag: DirectusErrorFlag;
  icon: string;
}[];

const pending = ref<string | null>(null);

/**
 * Requests a playground error endpoint and turns non-success responses into thrown values.
 * @param url Error endpoint URL.
 * @returns A promise that resolves for successful responses.
 */
async function requestError(url: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw { data: await response.json(), statusCode: response.status };
  }
}

/**
 * Triggers a selected normalized-error example and reports the matched flag in a toast.
 * @param key Playground error scenario key.
 * @returns A promise that resolves after the scenario has been handled.
 */
async function triggerError(key: (typeof scenarios)[number]["key"]) {
  pending.value = key;
  const scenario = scenarios.find((entry) => entry.key === key);
  if (!scenario) return;
  const errorUrl: string = `/api/directus-errors/${key}`;

  try {
    const result = await attempt(() => requestError(errorUrl));
    if (result.error !== null) {
      const directusError = useDirectusError(result.error);
      const firstError = directusError.errors[0];
      const errorType =
        firstError?.code ?? (directusError.isDirectusError ? "UNKNOWN" : "UNNORMALIZED_ERROR");
      const errorMessage =
        firstError?.message ??
        (result.error instanceof Error ? result.error.message : "The request failed.");
      const matchedFlag = directusError[scenario.flag];

      toast.add({
        title: `Caught ${errorType}`,
        description: `${errorMessage} · ${matchedFlag ? "Matched" : "Did not match"} ${scenario.flag}`,
        color: "error"
      });
    }
  } finally {
    pending.value = null;
  }
}
</script>

<template>
  <UContainer class="space-y-8 py-10">
    <UPageHeader
      title="Directus error handling"
      description="Trigger common Directus failures and inspect the normalized UI-friendly error message."
    />

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="Each card checks one normalized helper"
      description="The toast reports the Directus code, message, and whether the expected shorthand matched."
    />

    <div class="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="scenario in scenarios"
        :key="scenario.key"
        class="h-full"
        :ui="{ body: 'flex h-full flex-col' }"
      >
        <div class="flex h-full flex-col gap-5">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-highlighted">{{ scenario.title }}</h2>
            <p class="text-sm text-muted">{{ scenario.description }}</p>
            <UBadge color="neutral" variant="subtle">{{ scenario.flag }}</UBadge>
          </div>
          <UButton
            class="mt-auto"
            block
            :loading="pending === scenario.key"
            :disabled="pending !== null"
            label="Trigger error"
            :icon="scenario.icon"
            @click="triggerError(scenario.key)"
          />
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
