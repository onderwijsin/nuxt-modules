import { computed, ref } from "vue";
import { useRuntimeConfig, useToast } from "#imports";
import { turnstileErrorDataSchema } from "../../types/errors";

/** Minimal template-ref contract exposed by `NuxtTurnstile`. */
export interface TurnstileResetInstance {
  reset: () => void;
}

/**
 * Provides token lifecycle, retry, reset, and Nuxt UI feedback helpers.
 * @returns Turnstile state and lifecycle helpers.
 */
export function useTurnstile() {
  const runtimeConfig = useRuntimeConfig();
  const token = ref<string | undefined>();
  const toast = useToast();
  const isEnabled = computed(() => Boolean(runtimeConfig.public.turnstile?.siteKey?.trim()));
  const getToken = () => token.value?.trim() || undefined;

  async function getTokenWithRetry(retries = 12, delayMs = 250) {
    if (!isEnabled.value) return undefined;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const current = getToken();
      if (current) return current;
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
    return undefined;
  }

  function reset(instance?: TurnstileResetInstance) {
    token.value = undefined;
    if (isEnabled.value) instance?.reset();
  }

  function showPendingHint() {
    toast.add({
      title: "Please wait",
      description: "Security check in progress",
      color: "warning"
    });
  }

  function showMissingTokenErrorHint() {
    toast.add({
      title: "Security check failed",
      description: "Refresh the page and try again",
      color: "error"
    });
  }

  function captureTurnstileError(error: unknown) {
    const data = extractErrorData(error);
    if (!turnstileErrorDataSchema.safeParse(data).success) return false;
    showMissingTokenErrorHint();
    return true;
  }

  return {
    token,
    isEnabled,
    getToken,
    getTokenWithRetry,
    isReady: () => !isEnabled.value || Boolean(getToken()),
    reset,
    showPendingHint,
    showMissingTokenErrorHint,
    captureTurnstileError
  };
}

function extractErrorData(error: unknown): unknown {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const data = (error as { data?: unknown }).data;
  return data && typeof data === "object" && "data" in data
    ? (data as { data?: unknown }).data
    : data;
}
