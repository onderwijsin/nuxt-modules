import { parseURL, withoutTrailingSlash } from "ufo";

/**
 * Canonicalizes a redirect origin or request URL into a storage lookup key.
 * Query keys and values are sorted, so equivalent query strings share one key.
 *
 * @param value - Relative redirect origin or request URL.
 * @returns Canonical path, optionally followed by its normalized query string.
 */
export function toRedirectOrigin(value: string): string {
  const url = parseURL(value);
  const path = url.pathname === "/" ? "/" : withoutTrailingSlash(url.pathname || "/");
  const pairs = [...new URLSearchParams(url.search).entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyOrder = leftKey.localeCompare(rightKey);
      return keyOrder || leftValue.localeCompare(rightValue);
    }
  );
  const query = new URLSearchParams(pairs).toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Returns the path-only form of an origin key.
 *
 * @param origin - Canonical or raw origin.
 * @returns Canonical origin path without query parameters.
 */
export function toRedirectPath(origin: string): string {
  return toRedirectOrigin(origin).split("?", 1)[0] ?? "/";
}

/**
 * Returns a safe, mount-local entry key for an origin.
 *
 * @param origin - Canonical or raw redirect origin.
 * @returns Storage key under the redirects mount.
 */
export function toRedirectStorageKey(origin: string): string {
  return `entries:${encodeURIComponent(toRedirectOrigin(origin))}`;
}
