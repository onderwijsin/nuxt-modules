import { defineEventHandler } from "h3";
import { useStorage } from "nitropack/runtime";

const CACHE_KEY = "kennisbank:articles:example-slug";

/**
 * Returns the fixture cache state without creating an entry.
 * @returns The fixture cache value and metadata.
 */
export default defineEventHandler(async () => {
  const storage = useStorage("cache");
  return {
    data: { value: await storage.getItem(CACHE_KEY), metadata: await storage.getMeta(CACHE_KEY) }
  };
});
