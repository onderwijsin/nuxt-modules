import type { RedirectSource } from "./types/redirect";

/**
 * Defines a consumer redirect source with an explicit, typed default export.
 *
 * This entrypoint intentionally has no Nitro runtime imports, so generated source plugins can load
 * it during development without linking Nitro's virtual storage modules.
 *
 * @param source - Function that fetches normalized redirect data from an external system.
 * @returns The typed source, imported by the generated startup plugin.
 */
export function defineRedirectSource(source: RedirectSource): RedirectSource {
  return source;
}

export type { Redirect, RedirectSource } from "./types/redirect";
