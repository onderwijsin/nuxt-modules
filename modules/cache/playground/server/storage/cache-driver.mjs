import { createCacheDriver } from "@onderwijsin/nuxt-cache/runtime";
import { defineDriver } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

/**
 * Creates the memory-backed cache driver used only by the interactive playground.
 * @param options - Unstorage memory-driver options supplied by Nitro.
 * @returns A memory driver wrapped with cache metadata and indexing.
 */
export default defineDriver((options) => createCacheDriver(memoryDriver(options)));
