import { shallowRef } from "vue";

const ARTICLE_PATH = "/kennisbank/artikelen/example-slug";
const CACHE_BASE = "kennisbank:articles";

interface Article {
  id: string;
  title: string;
  generatedAt: string;
}

interface ArticleResponse {
  data: {
    key: string;
    value: Article;
    metadata: Record<string, unknown>;
    cacheStatus: "hit" | "miss";
  };
}

/**
 * Coordinates the playground's simulated public request and CMS invalidation flow.
 * @returns State and actions for the interactive cache demonstration.
 */
export function useCacheFlow() {
  const article = shallowRef<Article | null>(null);
  const cacheKey = shallowRef<string | null>(null);
  const metadata = shallowRef<Record<string, unknown> | null>(null);
  const cacheStatus = shallowRef<"hit" | "miss" | null>(null);
  const refreshedAt = shallowRef<string | null>(null);
  const errorMessage = shallowRef<string | null>(null);
  const isCreating = shallowRef(false);
  const isInvalidating = shallowRef(false);

  /** Refreshes the article from the simulated public route. */
  async function refresh(): Promise<void> {
    const response = await $fetch<ArticleResponse>(ARTICLE_PATH);
    article.value = response.data.value;
    cacheKey.value = response.data.key;
    metadata.value = response.data.metadata;
    cacheStatus.value = response.data.cacheStatus;
    refreshedAt.value = new Date().toISOString();
  }

  /** Simulates a visitor creating the route's cache entry, then reloads the displayed entry. */
  async function createCacheEntry(): Promise<void> {
    isCreating.value = true;
    errorMessage.value = null;
    try {
      await refresh();
    } catch {
      errorMessage.value = "Unable to create or read the cache entry.";
    } finally {
      isCreating.value = false;
    }
  }

  /** Simulates a CMS webhook invalidating the article's cache target and clears the displayed entry. */
  async function invalidateCacheEntry(): Promise<void> {
    isInvalidating.value = true;
    errorMessage.value = null;
    try {
      await $fetch("/api/_cache/invalidate", {
        method: "POST",
        body: {
          targets: [{ base: CACHE_BASE, path: ARTICLE_PATH, match: "exact" }]
        }
      });
      article.value = null;
      cacheKey.value = null;
      metadata.value = null;
      cacheStatus.value = null;
      refreshedAt.value = null;
    } catch {
      errorMessage.value = "Unable to invalidate the cache entry.";
    } finally {
      isInvalidating.value = false;
    }
  }

  return {
    article,
    cacheKey,
    metadata,
    cacheStatus,
    refreshedAt,
    errorMessage,
    isCreating,
    isInvalidating,
    createCacheEntry,
    invalidateCacheEntry
  };
}
