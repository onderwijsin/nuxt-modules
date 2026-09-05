import { randomBytes } from "node:crypto";

const DEVELOPMENT_SESSION_SECRET = "nuxt-directus-development-session-secret-32-chars";

/**
 * Resolves the build-time fallback used to validate Directus authentication options.
 *
 * @param options Fallback context and any explicitly configured secret.
 * @returns The configured or ephemeral secret, or undefined when production must fail validation.
 */
export function resolveDirectusSessionSecret(options: {
  readonly configured?: string;
  readonly isCI: boolean;
  readonly isPrepare: boolean;
  readonly isDevelopment: boolean;
}): string | undefined {
  if (options.configured) return options.configured;
  if (options.isCI || options.isPrepare) return randomBytes(32).toString("base64url");
  if (options.isDevelopment) return DEVELOPMENT_SESSION_SECRET;
  return undefined;
}
