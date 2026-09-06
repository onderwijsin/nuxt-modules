import { defineNitroPlugin } from "nitropack/runtime";
import { createAssetCacheState } from "./cache";

/**
 * Owns the lazy Directus asset cache handler for one Nitro application.
 *
 * @param nitroApp Nitro application instance.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.directusAssetCache = createAssetCacheState();
});
