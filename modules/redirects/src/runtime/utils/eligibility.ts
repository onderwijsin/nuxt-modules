import type { RedirectTime } from "../types/redirect";

import { isFiniteNumber, isString, isDefined } from "@onderwijsin/nuxt-module-utils/shared";

function toEpochMilliseconds(value: RedirectTime | undefined): number | null {
  if (value === null || !isDefined(value)) return null;
  if (isFiniteNumber(value)) return value;
  if (isString(value)) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  return null;
}

/**
 * Checks whether a redirect is eligible at a given point in time.
 *
 * The lower bound is inclusive and the upper bound is exclusive, matching the source scheduling
 * contract: `activeFrom <= now < activeUntil`.
 *
 * @param redirect - Redirect record with optional activation bounds.
 * @param now - Epoch milliseconds used for the eligibility check.
 * @returns Whether the redirect may currently be resolved.
 */
export function isRedirectActive(
  redirect: { activeFrom?: RedirectTime; activeUntil?: RedirectTime },
  now = Date.now()
): boolean {
  const activeFrom = toEpochMilliseconds(redirect.activeFrom);
  const activeUntil = toEpochMilliseconds(redirect.activeUntil);
  return (activeFrom === null || activeFrom <= now) && (activeUntil === null || now < activeUntil);
}
