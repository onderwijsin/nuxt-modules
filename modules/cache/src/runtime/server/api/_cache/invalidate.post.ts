import { assertAdminAccess } from "@onderwijsin/nuxt-module-utils/server";
import { createError, defineEventHandler, readBody } from "h3";
import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import { z } from "zod";
import { invalidateCacheSchema } from "../../utils/schema";
import { invalidateCacheTargets } from "../../utils/invalidate";

/**
 * Invalidates cache entries through their base-scoped reverse path indexes.
 * @param event - H3 event carrying the authenticated request.
 * @returns The number of invalidated cache entries.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event).nuxtCache;
  if (!config?.enabled) {
    throw createError({ statusCode: 404, statusMessage: "Cache invalidation is disabled." });
  }
  assertAdminAccess(event, config, import.meta.dev);

  const result = invalidateCacheSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid cache invalidation request.",
      data: z.treeifyError(result.error)
    });
  }

  try {
    const removed = await invalidateCacheTargets(
      useStorage("cache"),
      result.data.targets,
      config.maxInvalidatedEntries
    );
    return { data: { removed } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("configured")) {
      throw createError({ statusCode: 413, statusMessage: error.message });
    }
    throw error;
  }
});
