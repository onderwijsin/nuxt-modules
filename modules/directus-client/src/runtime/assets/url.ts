import { joinURL } from "ufo";

import { resolveDirectusUpstreamUrl } from "../core/upstream-url";

/** Options used to resolve an asset proxy request to its upstream URL. */
export interface DirectusAssetUrlOptions {
  /** Directus base URL used when no custom asset URL is configured. */
  readonly baseUrl: string;
  /** Local asset proxy path. */
  readonly proxyPath: string;
  /** Incoming asset proxy request URL. */
  readonly requestUrl: URL;
  /** Optional custom asset upstream base URL. */
  readonly assetUrl?: string;
}

/**
 * Resolves and validates a Directus asset URL while preserving its complete query string.
 *
 * Asset transformation parameters are intentionally not inspected or normalized here. The asset
 * path suffix and complete query string must be preserved when mapping the local proxy URL to
 * Directus so every transformation remains available to consumers.
 *
 * @param options Asset URL resolution options.
 * @returns Validated Directus asset URL.
 */
export function resolveDirectusAssetUrl(options: DirectusAssetUrlOptions): string {
  return resolveDirectusUpstreamUrl(
    options.assetUrl ?? joinURL(options.baseUrl, "assets"),
    options.proxyPath,
    options.requestUrl
  );
}
