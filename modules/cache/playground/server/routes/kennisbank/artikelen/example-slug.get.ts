import { defineEventHandler } from "h3";
import { useStorage } from "nitropack/runtime";

const CACHE_KEY = "kennisbank:articles:example-slug";

interface ArticleCacheEntry {
  id: string;
  title: string;
  generatedAt: string;
}

/**
 * Shapes the playground response with the cached value and driver metadata.
 * @param article - Cached article value.
 * @param cacheStatus - Whether the entry was read or created.
 * @param metadata - Cache driver metadata associated with the entry.
 * @returns API payload for the playground client.
 */
function toResponse(
  article: ArticleCacheEntry,
  cacheStatus: "hit" | "miss",
  metadata: Record<string, unknown>
) {
  return { data: { key: CACHE_KEY, value: article, metadata, cacheStatus } };
}

/**
 * Reads a cached article or simulates its first production request by creating the cache entry.
 * @returns The article and whether the request read a cache hit or created a cache miss.
 */
export default defineEventHandler(async () => {
  const storage = useStorage<ArticleCacheEntry>("cache");
  const cachedArticle = await storage.getItem(CACHE_KEY);
  if (cachedArticle) {
    return toResponse(cachedArticle, "hit", await storage.getMeta(CACHE_KEY));
  }

  const article: ArticleCacheEntry = {
    id: crypto.randomUUID(),
    title: "Example knowledge-base article",
    generatedAt: new Date().toISOString()
  };
  await storage.setItem(CACHE_KEY, article, { ttl: 300 });

  return toResponse(article, "miss", await storage.getMeta(CACHE_KEY));
});
