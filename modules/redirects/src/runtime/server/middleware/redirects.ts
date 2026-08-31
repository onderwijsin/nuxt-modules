import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";

import { findRedirect } from "../utils/storage";
import { createRedirectExclusionMatcher, isRedirectExcluded } from "../../utils/exclusions";
import { isExternalRedirectDestination, toRedirectDestination } from "../../utils/destination";
import { isRedirectSelfRedirect } from "../../utils/path";

const config = useRuntimeConfig().redirects;
const exclusions = config ? createRedirectExclusionMatcher(config) : null;

/**
 * Executes the server-side redirect lookup without any source or index enumeration work.
 *
 * @param event - Current request event.
 * @returns Nothing when no redirect matches.
 */
export default defineEventHandler(async (event) => {
  if (import.meta.prerender) return;
  if (!config?.serverMiddleware || !exclusions) return;

  const requestUrl = getRequestURL(event);
  const path = requestUrl.pathname;
  if (isRedirectExcluded(path, exclusions)) return;

  try {
    const redirect = await findRedirect(`${requestUrl.pathname}${requestUrl.search}`);
    if (redirect) {
      const destination = toRedirectDestination(redirect.to);
      if (
        !isExternalRedirectDestination(destination) &&
        isRedirectSelfRedirect(`${requestUrl.pathname}${requestUrl.search}`, destination)
      ) {
        console.warn(
          `[redirects] Ignoring self-redirect from ${JSON.stringify(requestUrl.pathname + requestUrl.search)} to ${JSON.stringify(destination)}.`
        );
        return;
      }
      return sendRedirect(event, destination, redirect.statusCode);
    }
  } catch (error) {
    console.error("[redirects] Server redirect lookup failed", error);
  }
});
