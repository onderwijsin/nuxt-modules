import { defineTask, useRuntimeConfig } from "nitropack/runtime";

import { DEFAULT_STALE_AFTER_SECONDS, pruneGlobalRateLimitStorage } from "../server/utils/global";

/** Prunes stale entries from the global simple rate limiter storage. */
export default defineTask({
  meta: {
    name: "simple-rate-limiter:prune",
    description: "Remove stale global simple rate limiter records."
  },
  async run() {
    const config = useRuntimeConfig();
    const staleAfter =
      config.simpleRateLimiter?.global?.pruning?.staleAfter ?? DEFAULT_STALE_AFTER_SECONDS;
    const summary = await pruneGlobalRateLimitStorage(staleAfter);

    console.info(
      `[simple-rate-limiter] Global pruning scanned ${summary.scanned} record(s), pruned ${summary.pruned}, retained ${summary.retained}.`
    );

    return { result: summary };
  }
});
