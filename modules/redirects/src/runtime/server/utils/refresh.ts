import type { H3Event } from "h3";

import type { RedirectIndex, RedirectSource } from "../../types/redirect";
import { useNitroApp } from "nitropack/runtime";

import { refreshRedirectStorage } from "./storage";

const REDIRECT_SOURCES_HOOK = "redirects:sources";

/**
 * Mutable context populated by the generated startup plugin before a refresh.
 *
 * Sources are appended in source-discovery order, preserving first-wins precedence without a
 * module-global registry. The task owns storage access; the startup plugin only owns discovery.
 */
interface RedirectSourcesContext {
  sources: RedirectSource[];
}

declare module "nitropack/types" {
  interface NitroRuntimeHooks {
    "redirects:sources": (context: RedirectSourcesContext) => void | Promise<void>;
  }
}

/**
 * Fetches every startup-registered source concurrently and writes the merged redirect index.
 *
 * @param event - Optional event forwarded to consumer sources.
 * @returns Redirect index keyed by normalized origin.
 */
export async function refreshRedirects(event?: H3Event): Promise<RedirectIndex> {
  const context: RedirectSourcesContext = { sources: [] };
  await useNitroApp().hooks.callHook(REDIRECT_SOURCES_HOOK, context);
  return refreshRedirectStorage(await Promise.all(context.sources.map((source) => source(event))));
}
