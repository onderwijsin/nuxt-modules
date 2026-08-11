import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

type DirectusTurnstileAction = "login" | "passwordRequest";

/**
 * Validates a configured Turnstile token for a Directus authentication operation.
 *
 * @param event - Incoming application request event.
 * @param action - Authentication operation requiring bot protection.
 */
export async function assertDirectusTurnstile(
  event: H3Event,
  action: DirectusTurnstileAction
): Promise<void> {
  const turnstile = useRuntimeConfig(event).directus.auth.turnstile;
  if (!turnstile.enabled) return;

  const { assertTurnstileToken } = await import("@onderwijsin/nuxt-turnstile/runtime");
  await assertTurnstileToken(event, turnstile.actions[action]);
}
