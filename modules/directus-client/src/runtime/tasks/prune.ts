import { defineTask, useRuntimeConfig } from "nitropack/runtime";
import { pruneAssetCache } from "../assets/prune";

/** Prunes stale Directus asset-cache entries when explicitly enabled by the consumer. */
export default defineTask({
  meta: {
    name: "directus-assets:prune",
    description: "Remove stale Directus asset-cache entries."
  },
  async run() {
    const config = useRuntimeConfig().directusClient.assets.cache;
    if (config.enabled !== true || config.prune.enabled !== true) {
      return { result: { scanned: 0, removed: 0, retained: 0, skipped: 0 } };
    }
    return { result: await pruneAssetCache(config) };
  }
});
