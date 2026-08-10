const BARE_DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#]|$)/i;

/**
 * Identifies redirect destinations that must leave the current Nuxt application.
 *
 * CMS users often omit `https://` when entering a hostname. A hostname with at least one dot and a
 * top-level domain is treated as external, while ordinary internal paths and relative segments
 * remain internal.
 *
 * @param destination - Redirect destination supplied by a consumer source.
 * @returns Whether the destination targets another origin.
 */
export function isExternalRedirectDestination(destination: string): boolean {
  return (
    /^https?:\/\//i.test(destination) ||
    destination.startsWith("//") ||
    BARE_DOMAIN_PATTERN.test(destination)
  );
}

/**
 * Produces a browser-safe destination without changing explicit URLs or internal paths.
 *
 * @param destination - Redirect destination supplied by a consumer source.
 * @returns The original destination, or an HTTPS URL for a protocol-less domain.
 */
export function toRedirectDestination(destination: string): string {
  return BARE_DOMAIN_PATTERN.test(destination) ? `https://${destination}` : destination;
}
