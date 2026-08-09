import { createCacheDriver } from "../../../../../src/runtime";
import { defineDriver } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

/**
 * Creates a fixture memory driver wrapped with cache metadata support.
 * @param options - Memory-driver options supplied by Nitro.
 * @returns A metadata-aware memory driver.
 */
export default defineDriver((options) => createCacheDriver(memoryDriver(options)));
