import { defineEventHandler } from "h3";
import { useStorage } from "nitropack/runtime";

const CACHE_KEY = "kennisbank:articles:example-slug";

/**
 * Simulates a public route that creates its cache entry on a miss.
 * @returns The cache value, metadata, and hit or miss state.
 */
export default defineEventHandler(async () => {
  const storage = useStorage<{ id: string }>("cache");
  const value = await storage.getItem(CACHE_KEY);
  if (value)
    return { data: { value, metadata: await storage.getMeta(CACHE_KEY), cacheStatus: "hit" } };

  const created = { id: crypto.randomUUID() };
  await storage.setItem(CACHE_KEY, created, { ttl: 300 });
  return {
    data: { value: created, metadata: await storage.getMeta(CACHE_KEY), cacheStatus: "miss" }
  };
});
