import type { H3Event } from "h3";

import type { Redirect, RedirectSource } from "../../types/redirect";
import { useNitroApp } from "nitropack/runtime";

const REDIRECT_SOURCES_HOOK = "redirects:sources";

/** Mutable context populated by the generated startup plugin before a source refresh. */
interface RedirectSourcesContext {
  sources: RedirectSource[];
}

declare module "nitropack/types" {
  interface NitroRuntimeHooks {
    "redirects:sources": (context: RedirectSourcesContext) => void | Promise<void>;
  }
}

/**
 * Fetches every startup-registered source concurrently while preserving source order.
 *
 * @param event - Optional event forwarded to consumer sources.
 * @returns Redirect arrays in source discovery order.
 */
export async function collectRedirectSourceResults(
  event?: H3Event
): Promise<readonly Redirect[][]> {
  const context: RedirectSourcesContext = { sources: [] };
  await useNitroApp().hooks.callHook(REDIRECT_SOURCES_HOOK, context);
  return Promise.all(context.sources.map((source) => source(event)));
}
