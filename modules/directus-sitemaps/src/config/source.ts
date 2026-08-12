import type {
  SitemapUrl,
  ResolvedDirectusCollectionOptions
} from "@onderwijsin/nuxt-directus-config/schema";
/**
 * Generates the Nitro-only configuration module consumed by sitemap handlers.
 *
 * Collection config contains executable code (mappers and fetchers), thus
 * cannot be stringified like the static url list
 *
 * @param collectionConfig Validated Directus collection configuration.
 * @param staticEntries Validated static sitemap entries.
 * @returns Source for the generated Nitro virtual module.
 */
export function generateDirectusSitemapsConfigSource(
  collectionConfig: ResolvedDirectusCollectionOptions,
  staticEntries: SitemapUrl[]
): string {
  const staticSource = JSON.stringify(staticEntries) ?? "[]";
  return `export default { collections: ${collectionConfig}, static: ${staticSource} };\n`;
}
