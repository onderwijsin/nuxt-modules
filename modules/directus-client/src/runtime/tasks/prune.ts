import { defineTask } from "nitropack/runtime";
import { runAssetCachePruneTask } from "../assets/prune";

/** Prunes stale Directus asset-cache entries when explicitly enabled by the consumer. */
export default defineTask({
  meta: {
    name: "directus-assets:prune",
    description: "Remove stale Directus asset-cache entries."
  },
  run: runAssetCachePruneTask
});
