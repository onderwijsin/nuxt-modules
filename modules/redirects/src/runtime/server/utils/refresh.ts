import type { H3Event } from "h3";

import type { RedirectIndex } from "../../types/redirect";

import { refreshRedirectStorage } from "./storage";
import { collectRedirectSourceResults } from "./sources";

/**
 * Fetches every startup-registered source concurrently and writes the merged redirect index.
 *
 * @param event - Optional event forwarded to consumer sources.
 * @returns Redirect index keyed by normalized origin.
 */
export async function refreshRedirects(event?: H3Event): Promise<RedirectIndex> {
  return refreshRedirectStorage(await collectRedirectSourceResults(event));
}
