type CollectionConfig = { collection: string };

function isMergeableRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Applies collection-specific overrides while preserving unrelated collection behavior.
 *
 * The selected property is merged when both values are objects. Boolean `false` values replace
 * an object value so a module can explicitly disable that behavior. Other properties from an
 * existing collection are intentionally left untouched.
 *
 * @param collections Existing collection configuration.
 * @param overrides Collection overrides keyed by collection name.
 * @param property Collection behavior to override, such as `sitemap` or `prerender`.
 * @returns Collection configuration with the selected overrides applied.
 */
export function applyOverridesToCollectionConfig<
  T extends CollectionConfig,
  K extends keyof T,
  O extends T
>(collections: T[], overrides: O[], property: K): T[] {
  const merged = new Map(collections.map((collection) => [collection.collection, collection]));

  for (const override of overrides) {
    const existing = merged.get(override.collection);
    if (!existing) {
      merged.set(override.collection, override);
      continue;
    }

    const existingValue = existing[property];
    const overrideValue = override[property];
    const next = { ...existing };

    if (overrideValue === false || existingValue === false) {
      Object.assign(next, { [property]: overrideValue });
    } else if (isMergeableRecord(existingValue) && isMergeableRecord(overrideValue)) {
      Object.assign(next, { [property]: { ...existingValue, ...overrideValue } });
    } else {
      Object.assign(next, { [property]: overrideValue });
    }

    merged.set(override.collection, next);
  }

  return [...merged.values()];
}
