import type { Redirect } from "../../../types/redirect";

import { z } from "zod";

import { toRedirectOrigin } from "./path";

const redirectSchema = z.strictObject({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).default(302)
});

/**
 * Validates and normalizes a redirect at the module boundary.
 *
 * @param value - Untrusted source or webhook value.
 * @returns Canonical redirect record.
 */
export function normalizeRedirect(value: unknown): Required<Redirect> {
  const redirect = redirectSchema.parse(value);
  if (!redirect.from.startsWith("/")) throw new Error("Redirect origins must start with '/'.");
  if (/\r|\n/.test(redirect.to))
    throw new Error("Redirect destinations must not contain newlines.");

  return { ...redirect, from: toRedirectOrigin(redirect.from) };
}
