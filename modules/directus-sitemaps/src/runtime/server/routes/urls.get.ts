import { createError, defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";
import { z } from "zod";

import { buildSitemapUrls } from "../utils/urls";

const querySchema = z.object({
  sitemap: z.string().trim().min(1).optional(),
  collection: z.string().trim().min(1).optional(),
  includeStatic: z.stringbool().default(true)
});

/**
 * Serves @nuxtjs/sitemap source URLs from configured Directus collections.
 *
 * @param event Incoming source request.
 * @returns Best-effort sitemap source entries.
 */
export default defineEventHandler(async (event) => {
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid sitemap query",
      data: z.treeifyError(query.error)
    });
  }
  const config = useRuntimeConfig(event).directusSitemaps;
  return buildSitemapUrls(
    event,
    config.collections,
    config.static,
    query.data.sitemap,
    query.data.collection,
    query.data.includeStatic
  );
});
