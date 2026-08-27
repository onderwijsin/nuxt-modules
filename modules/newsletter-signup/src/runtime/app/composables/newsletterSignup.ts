import { $fetch } from "ofetch";
import { useRuntimeConfig, useToast } from "#imports";
import { hasKey, isRecord } from "@onderwijsin/nuxt-module-utils/shared";
import { ERROR_CODES, newsletterSignupErrorDataSchema } from "../../types/errors";
import type { NewsletterSignupErrorCode } from "../../types/errors";

/** Public request payload accepted by the generated signup endpoint. */
export interface NewsletterSignupPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  userId?: string;
  userGroup?: string;
  source?: string;
  listId?: string;
}

/**
 * Provides the uniform signup request and Dutch Nuxt UI error handling.
 * @returns Signup and error-handling helpers.
 */
export function useNewsletterSignup() {
  const runtimeConfig = useRuntimeConfig();
  const toast = useToast();

  async function signup(payload: NewsletterSignupPayload) {
    return $fetch<{ success: true }>(runtimeConfig.public.newsletterSignup.endpoint.url, {
      method: "POST",
      body: payload
    });
  }

  function getErrorCode(error: unknown): NewsletterSignupErrorCode | undefined {
    const data = extractErrorData(error);
    const parsed = newsletterSignupErrorDataSchema.safeParse(data);
    return parsed.success ? parsed.data.code : undefined;
  }

  function handleSignupError(error: unknown): boolean {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.invalidInput) {
      toast.add({ title: "Ongeldige invoer", color: "error" });
    } else {
      toast.add({ title: "Er ging iets mis, probeer het nog een keer", color: "error" });
    }
    return true;
  }

  return { signup, getErrorCode, handleSignupError, ERROR_CODES };
}

function extractErrorData(error: unknown): unknown {
  if (!isRecord(error) || !hasKey(error, "data")) return undefined;
  const data = error.data;
  return isRecord(data) && hasKey(data, "data") ? data.data : data;
}
