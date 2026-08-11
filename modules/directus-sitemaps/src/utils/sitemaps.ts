/**
 * Creates the @nuxtjs/sitemap source configuration for this module.
 *
 * @param apiEndpoint Shared source endpoint.
 * @returns One source endpoint for Nuxt Sitemap.
 */
export function createSitemapSource(apiEndpoint: string): string[] {
  return [apiEndpoint];
}
