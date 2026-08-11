/**
 * Generates the Nitro-only configuration module consumed by sitemap handlers.
 *
 * Collection mappers and fetchers are executable values. When the shared
 * Directus config module is present, importing its server-only alias retains
 * those values without placing them in Nuxt runtime config.
 *
 * @param staticEntries Validated static sitemap entries.
 * @param useSharedConfig Whether the directus-config module resolved a config.
 * @returns Source for the generated Nitro virtual module.
 */
export function generateDirectusSitemapsConfigSource(
  staticEntries: unknown,
  useSharedConfig: boolean
): string {
  const staticSource = JSON.stringify(staticEntries) ?? "[]";
  if (!useSharedConfig) {
    return `export default { collections: [], static: ${staticSource} };\n`;
  }
  return `import directusConfig from "#directus-config-server";\nexport default { collections: directusConfig.collections?.collections ?? [], static: ${staticSource} };\n`;
}
