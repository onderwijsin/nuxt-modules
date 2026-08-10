import { getQuery, type H3Event } from "h3";
import { isString } from "@onderwijsin/nuxt-module-utils";

/** Runtime preview settings exposed by the module. */
export interface DirectusPreviewOptions {
  readonly enabled: boolean;
  readonly versioning: boolean;
  readonly queryKeys: {
    readonly preview: string;
    readonly token: string;
    readonly version: string;
    readonly id: string;
  };
}

/** The validated, request-scoped preview context. */
export interface DirectusPreviewContext {
  readonly isPreview: boolean;
  readonly token?: string;
  readonly version?: string;
  readonly id?: string;
}

const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function getString(value: unknown): string | undefined {
  return isString(value) ? value : undefined;
}

/**
 * Parses Directus live-preview query parameters without accepting arrays or malformed values.
 * @param query Request query values.
 * @param options Preview configuration.
 * @returns The validated preview context.
 */
export function parseDirectusPreviewContext(
  query: Record<string, unknown>,
  options: DirectusPreviewOptions
): DirectusPreviewContext {
  if (!options.enabled || getString(query[options.queryKeys.preview]) !== "true") {
    return { isPreview: false };
  }

  const token = getString(query[options.queryKeys.token]);
  const id = getString(query[options.queryKeys.id]);
  const rawVersion = getString(query[options.queryKeys.version]);
  const version =
    options.versioning &&
    id &&
    rawVersion &&
    rawVersion !== "main" &&
    VERSION_PATTERN.test(rawVersion)
      ? rawVersion
      : undefined;

  return {
    isPreview: true,
    ...(token ? { token } : {}),
    ...(version ? { version } : {}),
    ...(id ? { id } : {})
  };
}

/**
 * Reads and validates the preview context from a Nitro request.
 * @param event Nitro request event.
 * @param options Preview configuration.
 * @returns The validated preview context.
 */
export function getDirectusPreviewContext(
  event: H3Event,
  options: DirectusPreviewOptions
): DirectusPreviewContext {
  return parseDirectusPreviewContext(getQuery(event), options);
}
