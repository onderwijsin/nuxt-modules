import { createError, getRequestHeader, getRequestURL, type H3Event } from "h3";
import { attemptSync } from "@onderwijsin/nuxt-module-utils";

const csrfProtectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const csrfFailure = { statusCode: 403, statusMessage: "Directus CSRF validation failed" };

/**
 * Enforces same-origin metadata for state-changing browser requests.
 *
 * @param requestUrl - Incoming application request URL.
 * @param method - Incoming HTTP method.
 * @param origin - Origin header, when supplied by the client.
 * @param referer - Referer header fallback for clients that omit Origin.
 * @throws A 403 error when the request is missing or fails same-origin validation.
 */
export function assertDirectusSameOrigin(
  requestUrl: URL,
  method: string,
  origin?: string,
  referer?: string
): void {
  if (!csrfProtectedMethods.has(method.toUpperCase())) return;

  const candidate = origin ?? referer;
  if (!candidate) throw createError(csrfFailure);

  const parsedCandidate = attemptSync(() => new URL(candidate));
  if (parsedCandidate.error !== null || parsedCandidate.data === null)
    throw createError(csrfFailure);

  if (parsedCandidate.data.origin !== requestUrl.origin) throw createError(csrfFailure);
}

/**
 * Applies same-origin validation to an incoming H3 request event.
 *
 * @param event - Incoming application request event.
 * @throws A 403 error when the request is missing or fails same-origin validation.
 */
export function assertDirectusEventSameOrigin(event: H3Event): void {
  assertDirectusSameOrigin(
    getRequestURL(event),
    event.method,
    getRequestHeader(event, "origin"),
    getRequestHeader(event, "referer")
  );
}
