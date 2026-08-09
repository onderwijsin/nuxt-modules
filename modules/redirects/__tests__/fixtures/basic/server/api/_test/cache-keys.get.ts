import { defineEventHandler } from "h3";
import { useStorage } from "nitropack/runtime";

/**
 * Exposes cache keys for the integration fixture.
 *
 * @returns Cache storage keys after filtering to redirects entries.
 */
export default defineEventHandler(async () => ({
  data: (await useStorage().getKeys()).filter((key) => key.startsWith("cache:redirects:"))
}));
