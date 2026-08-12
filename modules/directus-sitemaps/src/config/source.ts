import type {
  DirectusCollectionConfig,
  ResolvedDirectusCollectionOptions,
  SitemapUrl
} from "@onderwijsin/nuxt-directus-config/schema";

/**
 * Merges serializable sitemap collection overrides into executable shared configuration.
 *
 * @param collections Executable collections from shared Directus configuration.
 * @param overrides Serializable direct sitemap module collections.
 * @returns Merged collection configuration.
 */
export function mergeDirectusSitemapCollections(
  collections: ResolvedDirectusCollectionOptions,
  overrides: DirectusCollectionConfig[]
): ResolvedDirectusCollectionOptions {
  const merged = new Map(collections.map((collection) => [collection.collection, collection]));

  for (const override of overrides) {
    const existing = merged.get(override.collection);
    if (!existing) {
      merged.set(override.collection, override);
      continue;
    }

    if (override.sitemap === false || existing.sitemap === false) {
      merged.set(override.collection, { ...existing, ...override });
      continue;
    }

    merged.set(override.collection, {
      ...existing,
      ...override,
      sitemap: { ...existing.sitemap, ...override.sitemap }
    });
  }

  return [...merged.values()];
}

/**
 * Generates the Nitro-only configuration module consumed by sitemap handlers.
 *
 * Executable shared configuration is imported from the server-only Directus config alias. Direct
 * module options are serialized as collection overrides because Nuxt options cannot safely carry
 * functions into the generated server bundle.
 *
 * @param collectionOverrides Serializable collection configuration from directusSitemaps.
 * @param staticEntries Validated static sitemap entries.
 * @param useSharedConfig Whether the directus-config module registered a shared config source.
 * @returns Source for the generated Nitro virtual module.
 */
export function generateDirectusSitemapsConfigSource(
  collectionOverrides: DirectusCollectionConfig[],
  staticEntries: SitemapUrl[],
  useSharedConfig: boolean
): string {
  const staticSource = JSON.stringify(staticEntries) ?? "[]";
  const overridesSource = JSON.stringify(collectionOverrides) ?? "[]";

  if (!useSharedConfig) {
    return `export default { collections: ${overridesSource}, static: ${staticSource} };\n`;
  }

  return `import directusConfig from "#directus-config-server";

const overrides = ${overridesSource};
const collections = new Map((directusConfig.collections ?? []).map((collection) => [collection.collection, collection]));

for (const override of overrides) {
  const existing = collections.get(override.collection);
  if (!existing) {
    collections.set(override.collection, override);
  } else if (override.sitemap === false || existing.sitemap === false) {
    collections.set(override.collection, { ...existing, ...override });
  } else {
    collections.set(override.collection, {
      ...existing,
      ...override,
      sitemap: { ...existing.sitemap, ...override.sitemap }
    });
  }
}

export default { collections: [...collections.values()], static: ${staticSource} };
`;
}
